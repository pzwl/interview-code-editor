const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CodeExecutor {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create temp directory:', error);
    }
  }

  async execute(code, language, input = '') {
    const executionId = uuidv4();
    const timeout = parseInt(process.env.CODE_EXECUTION_TIMEOUT) || 10000;
    const maxOutputSize = parseInt(process.env.MAX_OUTPUT_SIZE) || 10240;

    try {
      let result;
      
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          result = await this.executeJavaScript(code, input, executionId, timeout);
          break;
        case 'python':
        case 'py':
          result = await this.executePython(code, input, executionId, timeout);
          break;
        case 'java':
          result = await this.executeJava(code, input, executionId, timeout);
          break;
        case 'cpp':
        case 'c++':
          result = await this.executeCpp(code, input, executionId, timeout);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      // Limit output size
      if (result.output && result.output.length > maxOutputSize) {
        result.output = result.output.substring(0, maxOutputSize) + '\n... (output truncated)';
      }
      if (result.error && result.error.length > maxOutputSize) {
        result.error = result.error.substring(0, maxOutputSize) + '\n... (error truncated)';
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        executionTime: 0
      };
    } finally {
      // Cleanup temp files
      this.cleanup(executionId);
    }
  }

  async executeJavaScript(code, input, executionId, timeout) {
    const startTime = Date.now();
    
    // Wrap code to capture console output and handle input
    const wrappedCode = `
      const input = ${JSON.stringify(input)};
      const inputLines = input.split('\\n');
      let inputIndex = 0;
      
      // Mock readline for input
      const readline = {
        question: (query, callback) => {
          if (inputIndex < inputLines.length) {
            callback(inputLines[inputIndex++]);
          } else {
            callback('');
          }
        }
      };
      
      // Capture console output
      let output = '';
      const originalLog = console.log;
      console.log = (...args) => {
        output += args.join(' ') + '\\n';
      };
      
      try {
        ${code}
        console.log = originalLog;
        process.stdout.write(JSON.stringify({ success: true, output: output.trim() }));
      } catch (error) {
        console.log = originalLog;
        process.stdout.write(JSON.stringify({ success: false, error: error.message, output: output.trim() }));
      }
    `;

    return new Promise((resolve) => {
      const child = spawn('node', ['-e', wrappedCode], {
        timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        const executionTime = Date.now() - startTime;
        
        try {
          if (output) {
            const result = JSON.parse(output);
            resolve({
              ...result,
              executionTime
            });
          } else {
            resolve({
              success: false,
              error: error || 'No output received',
              output: '',
              executionTime
            });
          }
        } catch (parseError) {
          resolve({
            success: false,
            error: `Parse error: ${parseError.message}`,
            output: output,
            executionTime
          });
        }
      });

      child.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
          output: '',
          executionTime: Date.now() - startTime
        });
      });
    });
  }

  async executePython(code, input, executionId, timeout) {
    const startTime = Date.now();
    const fileName = `${executionId}.py`;
    const filePath = path.join(this.tempDir, fileName);

    // Wrap code to handle input
    const wrappedCode = `
import sys
import io

# Redirect stdin for input
sys.stdin = io.StringIO(${JSON.stringify(input)})

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
`;

    try {
      await fs.writeFile(filePath, wrappedCode);

      return new Promise((resolve) => {
        const child = spawn('python', [filePath], {
          timeout,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          error += data.toString();
        });

        child.on('close', (code) => {
          const executionTime = Date.now() - startTime;
          resolve({
            success: code === 0,
            output: output.trim(),
            error: error.trim(),
            executionTime
          });
        });

        child.on('error', (err) => {
          resolve({
            success: false,
            error: err.message,
            output: '',
            executionTime: Date.now() - startTime
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        executionTime: Date.now() - startTime
      };
    }
  }

  async executeJava(code, input, executionId, timeout) {
    const startTime = Date.now();
    const className = 'Main';
    const fileName = `${className}.java`;
    const filePath = path.join(this.tempDir, fileName);

    // Ensure the code has a Main class
    let javaCode = code;
    if (!code.includes('class Main')) {
      javaCode = `
public class Main {
    public static void main(String[] args) {
${code.split('\n').map(line => '        ' + line).join('\n')}
    }
}`;
    }

    try {
      await fs.writeFile(filePath, javaCode);

      // Compile
      const compileResult = await this.runCommand('javac', [filePath], timeout / 2);
      if (!compileResult.success) {
        return {
          success: false,
          error: `Compilation error: ${compileResult.error}`,
          output: '',
          executionTime: Date.now() - startTime
        };
      }

      // Execute
      const classPath = path.dirname(filePath);
      const executeResult = await this.runCommand('java', ['-cp', classPath, className], timeout / 2, input);
      
      return {
        ...executeResult,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        executionTime: Date.now() - startTime
      };
    }
  }

  async executeCpp(code, input, executionId, timeout) {
    const startTime = Date.now();
    const sourceFile = `${executionId}.cpp`;
    const sourcePath = path.join(this.tempDir, sourceFile);
    const executablePath = path.join(this.tempDir, executionId);

    try {
      await fs.writeFile(sourcePath, code);

      // Compile
      const compileResult = await this.runCommand('g++', ['-o', executablePath, sourcePath], timeout / 2);
      if (!compileResult.success) {
        return {
          success: false,
          error: `Compilation error: ${compileResult.error}`,
          output: '',
          executionTime: Date.now() - startTime
        };
      }

      // Execute
      const executeResult = await this.runCommand(executablePath, [], timeout / 2, input);
      
      return {
        ...executeResult,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        output: '',
        executionTime: Date.now() - startTime
      };
    }
  }

  runCommand(command, args, timeout, input = '') {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        error += data.toString();
      });

      if (input) {
        child.stdin.write(input);
        child.stdin.end();
      }

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim()
        });
      });

      child.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
          output: ''
        });
      });
    });
  }

  async cleanup(executionId) {
    try {
      const files = await fs.readdir(this.tempDir);
      const filesToDelete = files.filter(file => file.includes(executionId));
      
      await Promise.all(
        filesToDelete.map(file => 
          fs.unlink(path.join(this.tempDir, file)).catch(() => {})
        )
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

module.exports = new CodeExecutor();