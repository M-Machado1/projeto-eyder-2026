import "./src/style.css";

import "./src/style.css";

const campoCidade = document.getElementById("cidade");
const botaoPesquisar = document.getElementById("pesquisar");
const listaResultados = document.getElementById("resultados");




botaoPesquisar?.addEventListener("click", async () => {
    const cidade = (campoCidade as HTMLInputElement).value.trim();

    if (!cidade) {
        alert("Digite o nome de uma cidade!");
        return;
    }

    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=10&language=pt&format=json`;

    const resposta = await fetch(url);
    const dados = await resposta.json();

    const lista = listaResultados as HTMLUListElement;
    lista.innerHTML = "";

    if (!dados.results || dados.results.length === 0) {
        lista.innerHTML = "<li>Nenhuma localidade encontrada.</li>";
        return;
    }

  
dados.results.forEach((localidade: any) => {
    const item = document.createElement("li");
    const botao = document.createElement("button");

    botao.textContent =
        `${localidade.name} - ${localidade.admin1 ?? "Estado não informado"}, ${localidade.country}`;

    botao.className =
        "w-full text-left bg-slate-100 hover:bg-blue-100 p-3 rounded-lg";

    botao.addEventListener("click", () => {
        lista.innerHTML = "";

        const selecionado = document.createElement("li");

        selecionado.textContent =
            `Localidade selecionada: ${localidade.name} - ${localidade.admin1 ?? "Estado não informado"}, ${localidade.country}`;

        lista.appendChild(selecionado);

        console.log("Localidade escolhida:", localidade);
    });

    item.appendChild(botao);
    lista.appendChild(item);
});

});

