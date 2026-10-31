// src/data/tutorial.js

/**
 * Textos do tutorial da primeira pescaria (os textos do jogo ficam em data/).
 * Cada passo recebe `keys` ({ fish: () => 'G', stow: () => 'Q' }) para mostrar
 * a tecla configurada. `focus` destaca uma parte da barra enquanto o jogo está pausado.
 */
export const TUTORIAL = {
  firstCast: (keys) => `Primeira pescaria! Segure ${keys.fish()} para carregar a força (verde fraco, vermelho fortíssimo) e solte para lançar.`,

  qte: (keys) => ({
    title: 'O momento certo',
    text: `O peixe mordeu! O ponteiro vermelho corre pela barra, e você aperta ${keys.fish()} quando ele estiver na zona verde. Quanto mais perto do traço branco, melhor. Dessa vez o tempo parou no ponto perfeito. É só apertar.`,
    focus: 'zone',
  }),

  reelIntro: (keys) => ({
    title: 'Recolhendo o peixe',
    text: `Agora é cabo de guerra. SEGURE ${keys.fish()} para puxar o ponteiro para a direita e SOLTE para ele voltar. Mantenha-o dentro da zona verde: dentro dela, o peixe vem para o barco (barra de baixo). A zona anda de um lado para o outro, e o peixe também puxa. Solte a tecla para começar.`,
    focus: 'zone',
  }),

  reelDanger: (keys) => ({
    title: 'Cuidado com a linha',
    text: `Fora da zona a linha fica frouxa (a barra brilha em vermelho) e o peixe ganha terreno. Se passar tempo demais assim, a isca solta e ele leva. Volte para a zona com ${keys.fish()}.`,
    focus: 'zone',
  }),
};

export default TUTORIAL;