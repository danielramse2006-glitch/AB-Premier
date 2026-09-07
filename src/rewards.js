export const rewards=[[5,"Bebidas gratis"],[10,"Corte gratis"],[15,"Facial gratis"],[20,"Corte más bebida premium"],[25,"Playera AB Premium"],[28,"Agenda y pluma de AB Premier"],[32,"Termo de AB Premier"],[35,"Sobaquera de AB Premier y categoría Cliente Premium"]];
export const nextReward=n=>rewards.find(([cut])=>cut>n)||null;
