# Universal MIDI Controller

Controlador MIDI universal para pedaleiras, rodando direto no navegador via Web MIDI API.

**[Acessar o app →](https://hitaloose.github.io/universal-midi-controller/)**

---

## O que é

Uma interface web que transforma o navegador num controlador MIDI. Você configura pads de Preset e pads de FX, conecta qualquer dispositivo MIDI via USB e dispara mensagens MIDI sem instalar nada.

Funciona como PWA — pode ser instalado na tela inicial do computador ou celular para uso offline.

## Funcionalidades

- **Pads de Preset** — cada preset envia uma mensagem MIDI e define o estado inicial dos FX
- **Pads de FX** — botões toggle que enviam mensagens MIDI On/Off independentes
- **Modo Solo** — clique duas vezes num preset ativo para isolar os FX daquele preset
- **Seletor de dispositivo MIDI** — escolha entre todos os outputs MIDI conectados ao sistema
- **Exportar / Importar** — salva e carrega a configuração como arquivo JSON
- **PWA** — instalável, funciona offline após o primeiro carregamento

## Tecnologias

- [Next.js 16](https://nextjs.org/) com App Router e exportação estática
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API)

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

> **Requisito:** a Web MIDI API exige um navegador com suporte (Chrome/Edge) e, em alguns sistemas, permissão explícita para acesso a dispositivos MIDI.

## Build

```bash
npm run build   # gera a pasta out/ com o site estático
```

## Agradecimentos

O suporte à **Sonicake Pocket Master** (tap delay via SysEx) só foi possível graças ao trabalho de engenharia reversa documentado no repositório [**suckyble/PocketEdit**](https://github.com/suckyble/PocketEdit), que mapeou os comandos SysEx usados pelo app oficial para definir o tempo de delay.

## Deploy

O projeto é publicado automaticamente no GitHub Pages via GitHub Actions a cada push na branch `main`.

Para ativar o deploy num fork:
1. Vá em **Settings → Pages** do repositório
2. Em **Build and deployment → Source**, selecione **GitHub Actions**
