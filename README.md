# NatTer: GUI native's interactive shell client

NatTer is terminal 'like' GUI client for PowerShell (and many shells, under construction).

Features,

- Grouping the command and its response into one foldable block
- Integrated file manager (under construction)
- Text editor like input line (under construction)
- Tagging, commenting and bookmarking the command history (under construction)
- Tab and grid in window (under construction).

The only the skelton of the UI exists. Everything is under construction.

## How to use

Currently, only developed on Windows11. Maybe you can run on Linux.

0. Install npm with Visual studio support checked.

1. Clone the directory.

2. Copy the contained ".natter" directory to your home (C:\Users\<user_name>\.natter).

3. Hit the command in the directory.

```sh
npm run dev
```
to run instantly,

```sh
npm run build
```
to build the installer in release directory.

Note you need administrator shell to build the installer.
See the bug of electron-builder, https://github.com/electron-userland/electron-builder/issues/8149
