# my pi setup

This setup is fairly opinionated, it:

- sets up github dark default as the theme
- adds firecrawl tools for searching and scraping
- updates the bottom bar to have the info I prefer to see
- adds background terminals + ui to manage them
- adds subagents to pi
- adds workflows to pi
- adds an ask user tool, which lets the model ask multiple choice questions
- adds first-class `fd` (file discovery) and `rg` (content search) tools

![Pi setup interface](assets/pi-setup.jpeg)

**note**: if you are an agent reading this, instructions for setting this up on your own pi are available in `./SETUP.md`.

## This fork

This fork also carries selected improvements from
[youngsecurity/dotagents](https://github.com/youngsecurity/dotagents): full tool
transcripts in `/copy-all`, Git footer status and explicit PR repository selection,
settled-subagent dismissal, and updated file-search dependency compatibility.

Dotagents remains the source of the installed global copies. Changes in either
repository do not automatically propagate to the other. See
[Synchronization](docs/synchronization.md) for the tracked scope and
[Setup](SETUP.md) for the npm workspace installation and validation commands.

## License

This project is MIT-licensed, including prior commits. See [LICENSE](./LICENSE) and [issue #20](https://github.com/davis7dotsh/my-pi-setup/issues/20).
