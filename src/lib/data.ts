export type Category = "Automotivo" | "Sob medida" | "Outros nichos";

export type Example = {
  id: string;
  tag: string;
  name: string;
  description: string;
  category: Category;
  illustration: "ring" | "knob" | "bracket" | "bolt";
};

// Exemplos de aplicacoes; nao sao anuncios de itens em estoque.
export const examples: Example[] = [
  {
    id: "acabamento",
    tag: "ACABAMENTO",
    name: "Molduras e acabamentos",
    description: "Reposicao de detalhes internos para projetos de restauracao.",
    category: "Automotivo",
    illustration: "ring",
  },
  {
    id: "manopla",
    tag: "PERSONALIZACAO",
    name: "Manoplas e comandos",
    description: "Formas, encaixes e acabamentos conforme a sua necessidade.",
    category: "Sob medida",
    illustration: "knob",
  },
  {
    id: "suporte",
    tag: "SUPORTES",
    name: "Suportes especiais",
    description: "Componentes adaptados a medidas e aplicacoes especificas.",
    category: "Automotivo",
    illustration: "bracket",
  },
  {
    id: "projeto",
    tag: "OUTRAS APLICACOES",
    name: "Seu projeto, outra categoria",
    description: "Conte o que procura, mesmo que nao seja uma peca automotiva.",
    category: "Outros nichos",
    illustration: "bolt",
  },
];
