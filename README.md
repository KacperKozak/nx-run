# nxr

Fast, fuzzy target runner for [Nx](https://nx.dev) workspaces.

Type a few characters, pick one or many targets, and run them.
No more memorizing long `nx run @my/components:build:package` commands.

## Install

```sh
npm i -g nx-run
# or
pnpm add -g nx-run
# or
bun add -g nx-run
# or
yarn global add nx-run
```

## Usage

Run `nxr` anywhere inside an Nx workspace:

```sh
$ nxr
```

```sh
  app build█
  ──────────────────────────────────────
  > @my/app           build
    @my/dashboard     build
    @my/app           lint
    @my/app           test
    @my/app           format
    @my/app           serve

  [tab] select · [enter] run · [/] commands · [esc] clear
```

Queue multiple targets with `Tab`, then run them all with `Enter`:

```sh
  format█
  ──────────────────────────────────────
  > @my/app            format  ✓
    @my/dashboard      format  ✓
    @my/ui-button      format
    @my/logger         format
    @my/icons          format
  ╭──────────────────────────────────╮
  │ Queue [2]                        │
  │ 1. @my/app:format                │
  │ 2. @my/dashboard:format          │
  ╰──────────────────────────────────╯
  [tab] select · [enter] run · [/] commands · [esc] clear
```

## How it works

1. Scans all Nx projects and their targets on first run (cached after that)
2. Fuzzy search powered by [Fuse.js](https://www.fusejs.io) with segment-aware ranking
3. History tracks your recent selections so they show up first next time
4. Background resync keeps the cache fresh without blocking the UI

## Development

```sh
bun test         # run tests
bun tsc --noEmit # type check
```
