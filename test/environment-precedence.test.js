const { ContainerManager } = require('../dist/container');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Environment Variable Precedence', () => {
  let originalEnv;
  let tempDir;
  let mockDocker;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-sandbox-test-'));
    
    // Mock docker instance
    mockDocker = {};
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    
    // Clean up temporary files
    try {
      const files = fs.readdirSync(tempDir);
      for (const file of files) {
        fs.unlinkSync(path.join(tempDir, file));
      }
      fs.rmdirSync(tempDir);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('GitHub Token Precedence', () => {
    it('should prioritize .env file over credential discovery', () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 'GITHUB_TOKEN=github_pat_env_file_token\n');
      
      const config = {
        envFile: envFile,
        dockerImage: 'test-image'
      };
      
      const credentials = {
        github: {
          token: 'gho_discovered_host_token'
        }
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment(credentials);
      
      const githubTokenVar = envVars.find(env => env.startsWith('GITHUB_TOKEN='));
      expect(githubTokenVar).toBe('GITHUB_TOKEN=github_pat_env_file_token');
    });

    it('should fall back to credential discovery when .env file has no GitHub token', () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 'OTHER_VAR=some_value\n');
      
      const config = {
        envFile: envFile,
        dockerImage: 'test-image'
      };
      
      const credentials = {
        github: {
          token: 'gho_discovered_host_token'
        }
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment(credentials);
      
      const githubTokenVar = envVars.find(env => env.startsWith('GITHUB_TOKEN='));
      expect(githubTokenVar).toBe('GITHUB_TOKEN=gho_discovered_host_token');
    });

    it('should fall back to host environment when no .env file and no credential discovery', () => {
      process.env.GITHUB_TOKEN = 'github_host_env_token';
      
      const config = {
        dockerImage: 'test-image'
      };
      
      const credentials = {}; // No github credentials discovered
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment(credentials);
      
      const githubTokenVar = envVars.find(env => env.startsWith('GITHUB_TOKEN='));
      expect(githubTokenVar).toBe('GITHUB_TOKEN=github_host_env_token');
    });

    it('should handle GH_TOKEN fallback correctly', () => {
      process.env.GH_TOKEN = 'gh_cli_token';
      delete process.env.GITHUB_TOKEN;
      
      const config = {
        dockerImage: 'test-image'
      };
      
      const credentials = {}; // No github credentials discovered
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment(credentials);
      
      const githubTokenVar = envVars.find(env => env.startsWith('GITHUB_TOKEN='));
      const ghTokenVar = envVars.find(env => env.startsWith('GH_TOKEN='));
      
      expect(githubTokenVar).toBe('GITHUB_TOKEN=gh_cli_token');
      expect(ghTokenVar).toBe('GH_TOKEN=gh_cli_token');
    });
  });

  describe('Claude API Key Precedence', () => {
    it('should prioritize .env file over credential discovery for Claude API key', () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 'ANTHROPIC_API_KEY=sk-ant-env-file-key\n');
      
      const config = {
        envFile: envFile,
        dockerImage: 'test-image'
      };
      
      const credentials = {
        claude: {
          type: 'api_key',
          value: 'sk-ant-discovered-key'
        }
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment(credentials);
      
      const claudeApiKeyVar = envVars.find(env => env.startsWith('ANTHROPIC_API_KEY='));
      expect(claudeApiKeyVar).toBe('ANTHROPIC_API_KEY=sk-ant-env-file-key');
    });

    it('should fall back to credential discovery for Claude API key', () => {
      const config = {
        dockerImage: 'test-image'
      };
      
      const credentials = {
        claude: {
          type: 'api_key',
          value: 'sk-ant-discovered-key'
        }
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment(credentials);
      
      const claudeApiKeyVar = envVars.find(env => env.startsWith('ANTHROPIC_API_KEY='));
      expect(claudeApiKeyVar).toBe('ANTHROPIC_API_KEY=sk-ant-discovered-key');
    });
  });

  describe('Git Author Info Precedence', () => {
    it('should prioritize .env file over host environment for git author info', () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 
        'GIT_AUTHOR_NAME=Env File Author\n' +
        'GIT_AUTHOR_EMAIL=env@example.com\n'
      );
      
      process.env.GIT_AUTHOR_NAME = 'Host Author';
      process.env.GIT_AUTHOR_EMAIL = 'host@example.com';
      
      const config = {
        envFile: envFile,
        dockerImage: 'test-image'
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment({});
      
      const authorNameVar = envVars.find(env => env.startsWith('GIT_AUTHOR_NAME='));
      const authorEmailVar = envVars.find(env => env.startsWith('GIT_AUTHOR_EMAIL='));
      
      expect(authorNameVar).toBe('GIT_AUTHOR_NAME=Env File Author');
      expect(authorEmailVar).toBe('GIT_AUTHOR_EMAIL=env@example.com');
    });
  });

  describe('Config Environment Override', () => {
    it('should allow config.environment to override .env file variables', () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 
        'GITHUB_TOKEN=github_pat_env_file_token\n' +
        'CUSTOM_VAR=env_file_value\n'
      );
      
      const config = {
        envFile: envFile,
        dockerImage: 'test-image',
        environment: {
          GITHUB_TOKEN: 'github_pat_config_override',
          CUSTOM_VAR: 'config_override_value'
        }
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment({});
      
      const githubTokenVar = envVars.find(env => env.startsWith('GITHUB_TOKEN='));
      const customVar = envVars.find(env => env.startsWith('CUSTOM_VAR='));
      
      expect(githubTokenVar).toBe('GITHUB_TOKEN=github_pat_config_override');
      expect(customVar).toBe('CUSTOM_VAR=config_override_value');
    });
  });

  describe('.env File Parsing', () => {
    it('should handle quoted values correctly', () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 
        'SINGLE_QUOTED=\'single quoted value\'\n' +
        'DOUBLE_QUOTED="double quoted value"\n' +
        'UNQUOTED=unquoted value\n'
      );
      
      const config = {
        envFile: envFile,
        dockerImage: 'test-image'
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment({});
      
      const singleQuoted = envVars.find(env => env.startsWith('SINGLE_QUOTED='));
      const doubleQuoted = envVars.find(env => env.startsWith('DOUBLE_QUOTED='));
      const unquoted = envVars.find(env => env.startsWith('UNQUOTED='));
      
      expect(singleQuoted).toBe('SINGLE_QUOTED=single quoted value');
      expect(doubleQuoted).toBe('DOUBLE_QUOTED=double quoted value');
      expect(unquoted).toBe('UNQUOTED=unquoted value');
    });

    it('should skip comments and empty lines', () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 
        '# This is a comment\n' +
        '\n' +
        'VALID_VAR=valid_value\n' +
        '# Another comment\n' +
        '   \n' +
        'ANOTHER_VAR=another_value\n'
      );
      
      const config = {
        envFile: envFile,
        dockerImage: 'test-image'
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment({});
      
      const validVar = envVars.find(env => env.startsWith('VALID_VAR='));
      const anotherVar = envVars.find(env => env.startsWith('ANOTHER_VAR='));
      const commentVars = envVars.filter(env => env.includes('comment') || env.includes('#'));
      
      expect(validVar).toBe('VALID_VAR=valid_value');
      expect(anotherVar).toBe('ANOTHER_VAR=another_value');
      expect(commentVars).toHaveLength(0);
    });

    it('should handle values containing equals signs', () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 'URL_WITH_PARAMS=https://example.com?param1=value1&param2=value2\n');
      
      const config = {
        envFile: envFile,
        dockerImage: 'test-image'
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment({});
      
      const urlVar = envVars.find(env => env.startsWith('URL_WITH_PARAMS='));
      expect(urlVar).toBe('URL_WITH_PARAMS=https://example.com?param1=value1&param2=value2');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing .env file gracefully', () => {
      const config = {
        envFile: '/nonexistent/file.env',
        dockerImage: 'test-image'
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      
      // Should not throw an error
      expect(() => {
        containerManager.prepareEnvironment({});
      }).not.toThrow();
    });

    it('should handle malformed .env file gracefully', () => {
      const envFile = path.join(tempDir, '.env');
      fs.writeFileSync(envFile, 
        'VALID_VAR=valid_value\n' +
        'INVALID_LINE_NO_EQUALS\n' +
        'ANOTHER_VALID_VAR=another_value\n'
      );
      
      const config = {
        envFile: envFile,
        dockerImage: 'test-image'
      };
      
      const containerManager = new ContainerManager(mockDocker, config);
      const envVars = containerManager.prepareEnvironment({});
      
      const validVar = envVars.find(env => env.startsWith('VALID_VAR='));
      const anotherValidVar = envVars.find(env => env.startsWith('ANOTHER_VALID_VAR='));
      const invalidVar = envVars.find(env => env.includes('INVALID_LINE_NO_EQUALS'));
      
      expect(validVar).toBe('VALID_VAR=valid_value');
      expect(anotherValidVar).toBe('ANOTHER_VALID_VAR=another_value');
      expect(invalidVar).toBeUndefined();
    });
  });
});