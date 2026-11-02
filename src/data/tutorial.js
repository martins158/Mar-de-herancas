// src/data/tutorial.js

/**
 * Textos do TREINO / tutorial da primeira pescaria (os textos do jogo ficam em data/).
 * Cada passo recebe (keys, retry): `keys` = { fish: () => 'G', stow: () => 'Q' } para mostrar a
 * tecla configurada; `retry` = true quando o jogador não conseguiu pescar o primeiro peixe e o
 * treino está se repetindo (aí entram as DICAS DE MESTRE). `focus` destaca uma parte da barra.
 */
export const TUTORIAL = {
  // aviso antes do primeiro lançamento: é só um treino
  intro: (keys, retry) =>
    retry
      ? {
          title: 'Mais um treino',
          text: 'Não foi dessa vez, e tudo bem: ainda é só treino. Agora vou com uma dica de mestre. Respira fundo e vamos de novo.',
        }
      : {
          title: 'Só um treino',
          text: 'Faz tempo que o porto não vê peixe. Isto aqui é só um treino, pra ver se eu ainda sei fazer o que sempre fiz: pescar. Nada se perde se eu errar, então sem pressa.',
        },

  // dica no topo quando está pronto para lançar
  firstCast: (keys, retry) =>
    retry
      ? `De novo, sem pressa. Segure ${keys.fish()} para a força e solte para lançar: o amarelo já é suficiente.`
      : `Primeira pescaria! Segure ${keys.fish()} para carregar a força (verde fraco, vermelho fortíssimo) e solte para lançar.`,

  qte: (keys, retry) => ({
    title: retry ? 'O momento certo (de novo)' : 'O momento certo',
    text: retry
      ? `O peixe mordeu outra vez. O tempo para de novo no ponto perfeito: é só apertar ${keys.fish()}. O que vem depois é onde a coisa pega, então guarde a atenção para lá.`
      : `O peixe mordeu! O ponteiro vermelho corre pela barra, e você aperta ${keys.fish()} quando ele estiver na zona verde. Quanto mais perto do traço branco, melhor. Dessa vez o tempo parou no ponto perfeito. É só apertar.`,
    focus: 'zone',
  }),

  reelIntro: (keys, retry) =>
    retry
      ? {
          title: 'Dica de mestre',
          text: `Meu pai dizia: não corra atrás do peixe, converse com ele. O ponteiro tem inércia, então NÃO espere ele chegar: dê toques curtos em ${keys.fish()}, como quem puxa um fio. Segurar demais passa direto da zona; soltar demais afrouxa. Olhe para onde a zona VAI, não para onde ela está. Solte a tecla para começar.`,
          focus: 'zone',
        }
      : {
          title: 'Recolhendo o peixe',
          text: `Agora é cabo de guerra. SEGURE ${keys.fish()} para puxar o ponteiro para a direita e SOLTE para ele voltar. Mantenha-o dentro da zona verde: dentro dela, o peixe vem para o barco (barra de baixo). A zona anda de um lado para o outro, e o peixe também puxa. Solte a tecla para começar.`,
          focus: 'zone',
        },

  reelDanger: (keys, retry) =>
    retry
      ? {
          title: 'Dica de mestre',
          text: `Respira. Quem se desespera, puxa demais. Deixe o ponteiro voltar sozinho e só então toque ${keys.fish()} de novo. A linha aguenta um pouco de folga, mas não aguenta pânico.`,
          focus: 'zone',
        }
      : {
          title: 'Cuidado com a linha',
          text: `Fora da zona a linha fica frouxa (a barra brilha em vermelho) e o peixe ganha terreno. Se passar tempo demais assim, a isca solta e ele leva. Volte para a zona com ${keys.fish()}.`,
          focus: 'zone',
        },
};

export default TUTORIAL;