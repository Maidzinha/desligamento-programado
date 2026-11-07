# Desligamento Programado

Aplicativo para Windows que desliga, reinicia, suspende, hiberna ou faz logoff do computador depois de um tempo definido por você.

- Timer manual (horas, minutos e segundos) e tempos rápidos.
- Ações: desligar, reiniciar, suspender, hibernar, sair da conta.
- Para desligar e reiniciar usa o agendamento nativo do Windows (`shutdown`), que continua valendo se o app for fechado.
- Opções: forçar fechamento, aviso 1 minuto antes, iniciar com o Windows, bandeja e sempre no topo.

> Suspender, hibernar e sair da conta só funcionam enquanto o app estiver aberto.

## Rodar / gerar o .exe

Precisa do [Node.js](https://nodejs.org/).

- `TESTAR.bat` instala as dependências e abre o app.
- `GERAR-EXE.bat` gera o `.exe` portátil na pasta `dist`.

## Licença

Software proprietário de uso privado. O código é visível, mas não é de código aberto. Leia o arquivo [LICENSE](LICENSE) antes de usar.
