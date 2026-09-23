// BeeFlow AI — konfiguracja frontendu.
// Ten plik trzyma dane, które będziemy później zasilać z backendu.
window.BEEFLOW_CONFIG = {
  version: '10-structured',
  questions: [

      {key:'company',q:'Jak nazywa się Twoja firma? Jeśli nie masz jeszcze nazwy, napisz „nie mam nazwy”.'},
      {key:'businessBrief',q:'Opisz mi krótko, czym zajmuje się firma i jak wygląda Wasza praca. To jest materiał roboczy dla BeeFlow — nie wkleję go 1:1 na stronę, tylko na jego podstawie przygotuję krótsze, profesjonalne treści.'},
      {key:'city',q:'Na jakim obszarze działasz? Podaj miasto, powiat albo region.'},
      {key:'services',q:'Jakie są najważniejsze usługi? Wypisz 3–6 pozycji, rozdzielając je przecinkami.'},
      {key:'style',q:'Jaki klimat strony najbardziej pasuje do Twojej firmy?',chips:['Ciemna i premium','Jasna i nowoczesna','Mocna i sportowa','Elegancka i spokojna']},
      {key:'usp',q:'Co najbardziej wyróżnia Twoją firmę? Opisz to własnymi słowami. Jeśli nic nie chcesz dodawać, wpisz „pomiń”.'},
      {key:'phone',q:'Jaki numer telefonu ma być widoczny na stronie?'},
      {key:'email',q:'Jaki e-mail ma być na stronie? Jeśli nie chcesz go pokazywać, wpisz „pomiń”.'}
  ]
};
