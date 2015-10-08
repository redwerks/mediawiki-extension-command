MediaWiki Extension Command
===========================
`mediawiki-extension` is a shell command that simplifies installation and upgrading of MediaWiki extensions by automating the process of upgrading/downloading multiple extensions and automatically determining the correct location (composer package, git tag, git master, ...) to install from.

`mediawiki-extension` can download MediaWiki extensions from Composer, tagged releases in git, release branches (REL#_##), and the latest version from git. The [MediaWiki Extension Service](https://github.com/redwerks/mediawiki-extensionservice/) is used to fetch information on where to install extensions from.

## Installation
`mediawiki-extension` requires Node.js, command-line PHP, Git, and Composer.

* **Node.js**: Install from https://nodejs.org/ or your system's package manager.
* **PHP**
  * **OSX**: The version of `php` bundled with OSX should be sufficient.
  * **Linux**: Install via your system's package manager (`php-cli` may be a separate package)
* **Git**: See https://git-scm.com/downloads

After installing Node.js, `mediawiki-extension` can be installed by running:
```shell
$ sudo npm install -g mediawiki-extension
```

### Setup
`mediawiki-extension` needs to know where `php`, `git`, and `composer` live.

You can set this up using:
```shell
$ mediawiki-extension setup
```

During setup `mediawiki-extension` will look for `php`, `git`, and `composer` in common locations. If any command cannot be found it will give you the option of specifying the exact path to the command. Additionally if you have not already installed `composer`, `mediawiki-extension` can download composer on its own.

## Commands / Help

For a full command and argument list run:
```shell
$ mediawiki-extension --help
$ mediawiki-extension <command> --help
```

## Patterns
`mediawiki-extension` commands (aside from `help`, `info -r`, and `config`) should be run within the installation path of a MediaWiki installation.

### Get information about an extension
`mediawiki-extension info` provides extension information.

```shell
$ mediawiki-extension info ParserFunctions
From https://git.wikimedia.org/git/mediawiki/extensions/ParserFunctions
 * branch            master     -> FETCH_HEAD
   74afdca..bc04e03  master     -> origin/master
id: ParserFunctions
Name: ParserFunctions
Available sources:
 - git-master
 - git-rel
Git repository: https://git.wikimedia.org/git/mediawiki/extensions/ParserFunctions.git
Version hint: 1.6.0
Installed: Yes
Installed source: git-master
Installed commit: 74afdcab73ca66eac7e772c8df839a8b4b9e063f
Latest commit: bc04e03fb7ed5e0fe4effa55d3bea4f70e97aeaa
Updates available: 2 revs
```

### Download / Install extensions
`mediawiki-extension download` downloads extensions from the best available source (composer, git tags, git master, etc...).

```shell
$ mediawiki-extension download ParserFunctions
$ mediawiki-extension download SemanticMediaWiki SemanticForms
```

`mediawiki-extension` only fetches extensions and places them in `extensions/`. It does not install them. You will still need to add a `require_once` line and configuration in your `LocalSettings.php`.

To delete an old manually installed extension and replace it with one `mediawiki-extension` can mange, use the `-f`/`--force` option.

```shell
$ mediawiki-extension download -f ParserFunctions
```

### Update extensions
`mediawiki-extension update` updates one or more MediaWiki extensions to the latest version.

Show a list of extensions with updates available:
```shell
$ mediawiki-extension outdated
From https://git.wikimedia.org/git/mediawiki/extensions/ParserFunctions
 * branch            master     -> FETCH_HEAD
From https://git.wikimedia.org/git/mediawiki/extensions/Widgets
 * [new branch]      REL1_26    -> origin/REL1_26
   743d071..c00bf5f  master     -> origin/master
From https://git.wikimedia.org/git/mediawiki/extensions/Gadgets
 * branch            master     -> FETCH_HEAD
   dc77314..b105abf  master     -> origin/master
From https://git.wikimedia.org/git/mediawiki/extensions/VIKI
 * [new branch]      REL1_26    -> origin/REL1_26
   caf113b..9c72c72  master     -> origin/master
 * [new tag]         1.2.1      -> 1.2.1
From https://git.wikimedia.org/git/mediawiki/extensions/VisualEditor
 * branch            REL1_22    -> FETCH_HEAD
Gadgets (dc77314 -> b105abf [6 revs])
ParserFunctions (74afdca -> bc04e03 [2 revs])
VIKI (1.2.0 -> 1.2.1)
```

Select extensions for update from an interactive list:
```shell
$ mediawiki-extension update
❯◯ CheckUser
 ◯ Cldr
 ◯ Gadgets
 ◯ ParserFunctions
 ◯ SemanticMediaWiki
 ◯ Validator
 ◯ VisualEditor
 ◯ Widgets
```

Update a specific set of extensions:
```shell
$ mediawiki-extension update <Extension>...
$ mediawiki-extension update SemanticMediaWiki
$ mediawiki-extension update ParserFunctions CheckUser
```

Update all available extensions:
```shell
$ mediawiki-extension update --all
```

### List locally installed extensions
You can list the extensions available in the `extensions/` directory:

```shell
$ mediawiki-extension list
CheckUser (unknown)
Cldr (composer; 2015.08)
Gadgets (git-master; dc77314)
ParserFunctions (git-master; 74afdca)
SemanticMediaWiki (composer; 2.2.2)
Validator (composer; 2.0.4)
VisualEditor (git-rel; REL1_22; 43e96d7)
Widgets (git-tag; 1.2.0)
```

### Switch between git master and release branches

If the latest `git-master` of an extension breaks for you, you can switch to a `git-rel` to get the latest code branched for your release of MediaWiki.
```shell
$ mediawiki-extension switch <Extension> git-rel
```

After upgrading MediaWiki you can switch back to `git-master` and see if they're compatible.
```shell
$ mediawiki-extension switch <Extension> git-master
```
