# Wrestling Legacy · Beta da Carreira Livre

Crie seu lutador, assine com uma das sete empresas e jogue os combates por turnos. A beta reúne nove agendas, 300 perfis, 62 cinturões disputáveis e 17 edições de torneios por temporada. Os seis formatos jogáveis são Singles, Tag Team, Trios, Duplas mistas, Triple Threat e Fatal 4-Way.

## Rodar pelo pacote da beta

No GitHub, abra a execução que passou nos **Testes da Carreira Livre** e baixe **wrestling-legacy-beta** em **Artifacts** com sua conta conectada. Extraia o arquivo e abra o terminal na pasta que contém `COMO-TESTAR.md` e a subpasta `-WRESTLING-LEGACY`.

No Windows com Python instalado, execute:

```powershell
py -m http.server 4173 --bind 0.0.0.0
```

No macOS ou Linux com Python instalado, use:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Abra [http://localhost:4173/-WRESTLING-LEGACY/](http://localhost:4173/-WRESTLING-LEGACY/) no PC. Para testar no celular, conecte-o ao mesmo Wi-Fi e troque `localhost` pelo endereço IPv4 do PC na mesma URL. No Windows, o comando `ipconfig` mostra o IPv4 da rede Wi-Fi. Mantenha o terminal aberto durante o teste.

## Rodar pelo código

Com Git e Node.js 22.13 ou mais recente:

```bash
git clone --branch feat/beta-carreira-livre https://github.com/BhGoncalves15/-WRESTLING-LEGACY.git
cd ./-WRESTLING-LEGACY
npm ci
npm run dev
```

Abra o endereço **Local** no PC ou **Network** no celular conectado ao mesmo Wi-Fi.

## Começar uma carreira

1. Em **Nova carreira**, escolha **Usar exemplo BH** para carregar o personagem de referência. Confira os atributos e golpes, depois crie a carreira.
2. Em **Contratos**, negocie ou aceite uma proposta. Use **Avançar calendário** para entrar no card.
3. Em **Combates**, derrube o rival para tentar pinfall ou submissão. Use o XP ganho em **Meu lutador**. Ali também é possível formar equipes e escolher o formato preferido.
4. Em **Competições**, acompanhe rankings, rivalidades e torneios. Em **Calendário → Resultados**, use a paginação e o filtro de empresa para consultar shows anteriores.
5. Em **Salvamentos**, abra ou exporte uma carreira. A beta carrega saves das versões 1 a 7 e grava automaticamente depois de cada ação confirmada. O PC e o celular têm armazenamentos próprios. Para continuar a mesma carreira em outro aparelho, exporte o JSON em um e importe no outro.

## Verificação

Os testes de navegador usam o pacote de produção em perfis de PC, Android e iPhone. A jornada principal cria BH, negocia um contrato, fecha a aba com a luta em andamento, retoma o turno salvo, ganha e usa XP e exporta e importa a carreira. Ela também é executada em uma origem HTTP equivalente à da rede local. Um teste em 320 px navega pelas telas principais e consulta resultados de três temporadas. A execução do GitHub registra os resultados do motor, dos salvamentos e dos navegadores.

Nas simulações de 2026 a 2028, cada dificuldade completou 1.590 shows e 51 edições de torneios, com disputas pelos 62 cinturões jogáveis. As exportações ficaram em torno de 2,3 MB por carreira e a importação preservou shows, resultados e chaves. O calendário exibe 20 resultados por página.

## Escopo após a beta

O roteiro do jogo completo inclui Carreira História, estipulações adicionais, cinturões pendentes, gestão de empresas e evolução dos elencos com transferências, aposentadorias e novos talentos.
