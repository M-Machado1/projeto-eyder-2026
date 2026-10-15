# Consulta Meteorológica

Aplicação web para consultar o tempo atual e a previsão dos próximos dias de uma cidade.
Trabalho da 1ª Avaliação de Programação Web (UESPI).

## Integrantes

- Bruno Vinicius
- Murilo

## Funcionalidades

- Pesquisa de localidade pelo nome, com escolha quando há mais de uma correspondência.
- Condições atuais: temperatura, condição, vento, umidade e horário dos dados.
- Previsão de 5 dias: mínima, máxima, condição e chance de chuva.
- Nova pesquisa sem recarregar a página.
- Feedback de carregamento, ausência de resultados, entrada inválida e erros de comunicação.

## API utilizada

[Open-Meteo](https://open-meteo.com/), sem chave de acesso:

- Forecast API: https://open-meteo.com/en/docs
- Geocoding API: https://open-meteo.com/en/docs/geocoding-api

## Tecnologias

HTML5 semântico, TypeScript, Tailwind CSS v4 e Vite (servidor de desenvolvimento e build).

## Como executar

Requer Node.js.

```bash
npm install
npm run dev
```

Acesse o endereço exibido no terminal (normalmente http://localhost:5173).

Para verificar tipos e gerar a versão de produção:

```bash
npm run build
```

## Estrutura

- `index.html`: estrutura da página.
- `src/main.ts`: lógica da aplicação (requisições, formatação e interface).
- `src/style.css`: ponto de entrada do Tailwind.
