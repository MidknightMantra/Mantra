# Contributing to Mantra

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Your First Code Contribution](#your-first-code-contribution)
- [Styleguides](#styleguides)
  - [Git Commit Messages](#git-commit-messages)
  - [JavaScript Styleguide](#javascript-styleguide)

## Code of Conduct

This project and everyone participating in it is governed by the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/0/code_of_conduct/). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs
This section guides you through submitting a bug report for Mantra. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

**Before Submitting a Bug Report**
*   **Check the [debugging guide](docs/TROUBLESHOOTING.md).**
*   **Search existing issues.**
*   **Ensure you are using the latest version.**

### Suggesting Enhancements
Enhancement suggestions are tracked as [GitHub issues](https://github.com/MidknightMantra/Mantra/issues).

### Your First Code Contribution
Unsure where to begin? You can look through these issues:
*   [Good First Issue](https://github.com/MidknightMantra/Mantra/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) - issues which should only require a few lines of code, and a test or two.

## Styleguides

### Git Commit Messages
*   Use the present tense ("Add feature" not "Added feature")
*   Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
*   Limit the first line to 72 characters or less
*   Reference issues and pull requests liberally after the first line

### JavaScript Styleguide
*   Use **ES6+** syntax (const, let, arrow functions, async/await).
*   **Logging**: ALWAYS use `log.info`, `log.error`, `log.action`, etc. from `src/utils/logger.js`. NEVER use `console.log`.
*   **Database**: Use the abstract helpers in `lib/database.js` (`getSetting`, `setSetting`) rather than accessing the DB directly.
*   **Plugins**: Follow the standard plugin structure seen in `plugins/example.js`.

### Testing
*   All new features **MUST** include unit tests.
*   Run `npm test` before submitting your PR to ensure no regressions.

## Pull Request Process
1.  Fork the repo and create your branch from `main`.
2.  If you've added code that should be tested, add tests.
3.  Ensure the test suite passes (`npm test`).
4.  Make sure your code lints.
5.  Issue that pull request!

Happy coding! 🚀
