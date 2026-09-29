// BeeFlow AI — konfiguracja frontendu.
// Ten plik trzyma dane, które będziemy później zasilać z backendu.
window.BEEFLOW_CONFIG = {
  version: '12-stable',
  questions: [

      {key:'company',q:'Jak nazywa się Twoja firma? Jeśli nie masz jeszcze nazwy albo dopiero ją wymyślamy, napisz po prostu „nie mam nazwy”.'},
      {key:'businessBrief',q:'Opisz własnymi słowami, czym zajmuje się firma. Możesz pisać normalnym zdaniem — to materiał roboczy do rozpoznania branży i przygotowania treści, nie tekst do wklejenia 1:1 na stronę.'},
      {key:'city',q:'Na jakim obszarze działasz? Podaj miasto, powiat albo region.'},
      {key:'services',q:'Jakie są najważniejsze usługi? Wypisz je po swojemu — najlepiej 2–6 pozycji, rozdzielonych przecinkami.'},
      {key:'style',q:'Jaki klimat strony najbardziej pasuje do Twojej firmy?',chips:['Ciemna i premium','Jasna i nowoczesna','Mocna i sportowa','Elegancka i spokojna']},
      {key:'usp',q:'Co najbardziej wyróżnia Twoją firmę? Opisz to własnymi słowami. Jeśli nic nie chcesz dodawać, wpisz „pomiń”.'},
      {key:'phone',q:'Jaki numer telefonu ma być widoczny na stronie?'},
      {key:'email',q:'Jaki e-mail ma być na stronie? Jeśli nie chcesz go pokazywać, wpisz „pomiń”.'}
  ]
};
