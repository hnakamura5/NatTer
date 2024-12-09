# Setup

## Basic

https://electron-vite.github.io/guide/getting-started.html

```sh
npm create vite@latest my-electron-vite-project

? Select a framework: › - Use arrow-keys. Return to submit.
    Vanilla
    Vue
    React
    Preact
    Lit
    Svelte
❯   Others

? Select a variant: › - Use arrow-keys. Return to submit.
    create-vite-extra ↗
❯   create-electron-vite ↗

# Choose your preferred front-end framework language
? Project template: › - Use arrow-keys. Return to submit.
❯   Vue
    React
    Vanilla

# Enter the project to download dependencies and run them
cd my-electron-vite-project
npm install
npm run dev
```

## Material UI/Icons

https://mui.com/material-ui/
```sh
npm install @mui/material @emotion/react @emotion/styled
```

https://mui.com/material-ui/material-icons/
```sh
npm install @mui/icons-material @mui/material @emotion/styled @emotion/react
```

## tRPC

electron-trpc
@trpc/client
@trpc/server
@trpc/react-query

@tanstack/react-query must be"^4.18.0" because of the requirement of @trpc.

## node-pty

https://github.com/microsoft/node-pty

Hard to install.

TODO: Write this.
