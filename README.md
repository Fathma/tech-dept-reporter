# Tech Debt Reporter

A Node.js CLI tool to scan JavaScript/TypeScript projects for technical debt, outdated dependencies, and code quality issues. Integrates with OpenAI for deeper analysis.

## Features
- Scans all files recursively in a target directory
- Detects hardcoded configs, missing error handling, unused imports, and more
- Reports actionable issues and suggested fixes
- Supports OpenAI-powered code analysis

## Prerequisites
- Node.js (v18 or newer recommended)
- npm
- OpenAI API key (for advanced analysis)

## Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Fathma/tech-dept-reporter.git
   cd tech-dept-reporter
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Add your OpenAI API key to a `.env` file in the project root:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

Alternatively, you can set the environment variable directly in your shell before running the tool:
   ```bash
   export OPENAI_API_KEY=your_openai_api_key_here
   ```
This allows the CLI to access your API key securely during execution.

## Usage
Run the CLI tool on a target project directory:

```bash
NODE_NO_WARNINGS=1 OPENAI_API_KEY=$(grep OPENAI_API_KEY .env | cut -d '=' -f2) npx techdebt-scan /path/to/your/project
```

Or, if your environment variable is already set:

```bash
NODE_NO_WARNINGS=1 npx techdebt-scan /path/to/your/project
```

## Output
- The tool will log the number of files scanned, detected issues, and suggested fixes in the terminal.

## Troubleshooting
- If you see an ESLint config error, migrate your config to `eslint.config.js` as per [ESLint v9+ migration guide](https://eslint.org/docs/latest/use/configure/migration-guide).
- Ensure your `.env` file is present and contains a valid OpenAI API key.

## License
MIT
