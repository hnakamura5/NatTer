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

## Chat UI

https://github.com/chatscope/chat-ui-kit-react
https://chatscope.io/docs/
```sh
npm install @chatscope/chat-ui-kit-react
```

## File Manager

https://www.npmjs.com/package/@syncfusion/ej2-react-filemanager
```sh
npm install @syncfusion/ej2-react-filemanager
```
## tRPC

electron-trpc
@trpc/client
@trpc/server
@trpc/react-query

@tanstack/react-query は@trpcの要求のため "^4.18.0",
にする必要がある。
