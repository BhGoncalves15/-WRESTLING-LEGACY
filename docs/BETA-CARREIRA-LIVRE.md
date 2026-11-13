# Wrestling Legacy · Beta da Carreira Livre

Crie seu lutador, assine com uma das sete empresas e dispute combates por turnos. O universo abre em 01/01/2026 com nove agendas, 300 perfis e 62 cinturões disputáveis entre os 71 cadastrados.

## Jogar no Windows

1. Baixe o ZIP **wrestling-legacy-beta** e use **Extrair tudo**.
2. Abra a pasta extraída e dê dois cliques em **JOGAR-WINDOWS.exe**. O jogo abre no navegador.
3. Deixe a janela do iniciador aberta enquanto joga. Se o navegador estiver fechado, use [localhost:4173/-WRESTLING-LEGACY/](http://localhost:4173/-WRESTLING-LEGACY/).

## Jogar no Android ou iPhone

1. Conecte o PC e o celular ao mesmo Wi-Fi.
2. No PC, feche o iniciador anterior e abra **JOGAR-NO-CELULAR.cmd**. Se o Windows mostrar a configuração de rede, permita o acesso na rede privada em que você vai jogar.
3. Abra no navegador do celular o endereço marcado como **celular** na janela do iniciador. Mantenha o PC ligado.

## Rodar pelo código

Com Git e Node.js 22.13 ou mais recente:

```bash
git clone --branch feat/revisao-beta https://github.com/BhGoncalves15/-WRESTLING-LEGACY.git
cd ./-WRESTLING-LEGACY
npm ci
npm run dev
```

Abra o endereço **Local** no PC ou **Network** no celular conectado ao mesmo Wi-Fi. No macOS ou Linux com Python, o ZIP também pode ser aberto com `python3 -m http.server 4173 --bind 0.0.0.0` na pasta extraída e o mesmo endereço do iniciador.

## Começar ou continuar uma carreira

- **Nova carreira → Usar exemplo BH** preenche o personagem de referência. Confira a origem, o visual, os atributos e os golpes nas quatro etapas.
- Em **Contratos**, negocie ou aceite uma proposta. Depois, use **Avançar calendário** para entrar no card.
- Em **Meu lutador**, edite o visual, melhore atributos, escolha o formato preferido e abra o catálogo de golpes para reproduzir as demonstrações ou aprender o Spear.
- Em **Campeonatos**, abra um card para consultar as fontes, as versões de design e o reinado. Propostas de unificação aparecem quando o jogador detém dois títulos compatíveis.
- Em **Salvamentos**, importe uma carreira das versões 1 a 8. Exporte o JSON na versão anterior antes de trocar de aparelho ou endereço, pois os saves ficam guardados no navegador da origem em que você jogou.
