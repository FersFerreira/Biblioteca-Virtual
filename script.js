let cardContainer = document.querySelector(".card-container");

let dados = []; 
let mostrandoFavoritos = false;
let ultimoGeneroAtivo = 'Todos'; // Guarda o último gênero selecionado

// Adiciona um listener que aguarda o carregamento completo do DOM
document.addEventListener("DOMContentLoaded", iniciarBusca);
document.addEventListener("DOMContentLoaded", criarSecaoRecomendacao);
document.addEventListener("DOMContentLoaded", setupBotaoTopo);

async function iniciarBusca (){
    let resposta = await fetch("data.json");
    let dadosJson = await resposta.json();

    // Carrega os favoritos do localStorage
    const favoritosSalvos = JSON.parse(localStorage.getItem('favoritos')) || [];

    // Adiciona o status de favorito aos dados
    dados = dadosJson.map(dado => ({
        ...dado,
        favorito: favoritosSalvos.includes(dado.nome)
    }));

    // Exibe as recomendações salvas no console para fácil visualização do admin
    let recomendacoesSalvas = JSON.parse(localStorage.getItem('recomendacoes')) || {};

    // --- Bloco de Migração de Dados ---
    // Converte dados do formato antigo (array) para o novo (objeto de contagem)
    if (Array.isArray(recomendacoesSalvas)) {
        console.log("Detectado formato antigo de recomendações. Convertendo para o novo formato...");
        const novoFormato = {};
        recomendacoesSalvas.forEach(rec => {
            const chave = rec.toLowerCase();
            novoFormato[chave] = (novoFormato[chave] || 0) + 1;
        });
        localStorage.setItem('recomendacoes', JSON.stringify(novoFormato));
        recomendacoesSalvas = novoFormato; // Atualiza a variável local
    }
    // --- Fim do Bloco de Migração ---

    const listaParaTabela = Object.keys(recomendacoesSalvas).map(chave => {
        return { "Livro Recomendado": chave, "Vezes Pedido": recomendacoesSalvas[chave] };
    });

    // Ordena a lista para mostrar os mais pedidos primeiro
    listaParaTabela.sort((a, b) => b["Vezes Pedido"] - a["Vezes Pedido"]);

    if (listaParaTabela.length > 0) {
        console.log("--- Recomendações dos Usuários ---");
        console.table(listaParaTabela);
        console.log("---------------------------------");
    } else {
        console.log("Nenhuma recomendação de usuário foi salva ainda.");
    }

    // Função para atualizar o estado ativo dos botões de gênero
    const atualizarBotaoAtivo = (botaoClicado) => {
        document.querySelectorAll('.botao-genero').forEach(btn => btn.classList.remove('ativo'));
        if (botaoClicado) {
            botaoClicado.classList.add('ativo');
        }
    };

    criarFiltrosDeGenero(dados, atualizarBotaoAtivo);

    renderizarCards(dados);

    const botaoBusca = document.querySelector("#botao-busca");
    const botaoFavoritos = document.querySelector("#botao-favoritos");

    // Função para aplicar o efeito de flash nos botões
    const aplicarFlash = (botao) => {
        // Apenas remove o foco do botão após um pequeno atraso para garantir que ele não fique "ativo".
        setTimeout(() => botao.blur(), 150);
    };

    // Verifica se o botão de busca existe antes de adicionar o listener
    if (botaoBusca) {
        botaoBusca.addEventListener("click", () => {
            atualizarBotaoAtivo(null); // Desativa qualquer botão de gênero ativo

            const campoBusca = document.querySelector("#busca");
            // Normaliza o termo de busca para remover acentos
            const termoBusca = campoBusca.value.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

            // Aplica o efeito de flash no botão de busca
            aplicarFlash(botaoBusca);

            if (termoBusca !== "") {
                const dadosFiltrados = dados.filter(dado => {
                    // Normaliza os dados do livro para a comparação
                    const nomeNormalizado = dado.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
                    const generoNormalizado = dado.genero.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        
                    // Compara os textos normalizados
                    return nomeNormalizado.includes(termoBusca) || 
                           generoNormalizado.includes(termoBusca)
                });

                renderizarCards(dadosFiltrados);
                mostrandoFavoritos = false;
                campoBusca.value = ''; // Limpa o campo de busca após a pesquisa
                campoBusca.blur(); // Remove o foco do campo de busca (esconde o teclado no celular)
                setTimeout(() => botaoBusca.blur(), 100); // Remove o foco do botão para resetar o estilo
            } else {
                // Se a busca estiver vazia, renderiza todos os cards novamente
                renderizarCards(dados);
            }
        });

        // Opcional: fazer a busca funcionar com a tecla Enter também
        document.querySelector("#busca").addEventListener("keyup", (event) => {
            if (event.key === "Enter") {
                botaoBusca.click();
            }
        });
    }

    if (botaoFavoritos) {
        botaoFavoritos.addEventListener("click", () => {
            // Aplica o efeito de flash no botão de favoritos
            aplicarFlash(botaoFavoritos);

            if (!mostrandoFavoritos) { // Se NÃO estamos vendo os favoritos, vamos mostrar
                mostrandoFavoritos = true;
                renderizarCards(dados.filter(dado => dado.favorito));
                const campoBusca = document.querySelector("#busca");
                campoBusca.value = ''; // Limpa o campo de busca
                campoBusca.blur(); // Remove o foco do campo de busca
                setTimeout(() => botaoFavoritos.blur(), 100); // Remove o foco do botão para resetar o estilo
                atualizarBotaoAtivo(null); // Desativa qualquer botão de gênero ativo
            } else {
                mostrandoFavoritos = false;
                // Ao sair dos favoritos, volta para o último gênero que estava ativo
                if (ultimoGeneroAtivo === 'Todos') {
                    renderizarCards(dados);
                } else if (ultimoGeneroAtivo === 'Nacionais') {
                    renderizarCards(dados.filter(d => d.br === true));
                } else {
                    renderizarCards(dados.filter(d => d.genero === ultimoGeneroAtivo));
                }

                // Encontra e reativa o botão de gênero correto
                const botoesGenero = document.querySelectorAll('.botao-genero');
                botoesGenero.forEach(botao => {
                    // Compara o texto do botão (ou um identificador para "Nacionais") com o último gênero ativo
                    const nomeBotao = botao.textContent.trim();
                    if (nomeBotao === ultimoGeneroAtivo || (ultimoGeneroAtivo === 'Nacionais' && nomeBotao.includes('Nacionais'))) {
                        atualizarBotaoAtivo(botao);
                    }
                });
            }
        });
    }
}

function criarFiltrosDeGenero(dados, atualizarBotaoAtivo) {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    // Define o layout exato dos botões em 3 linhas
    const layoutGeneros = [
        ['Todos', 'Clássico', 'Fantasia', 'Ficção cientifica'],
        ['LGBTQ+', 'Realismo mágico', 'Romance'],
        ['Suspense', 'Terror', 'Nacionais']
    ];

    const secaoGeneros = document.createElement('section');
    secaoGeneros.classList.add('secao-generos');

    layoutGeneros.forEach(linha => {
        const linhaContainer = document.createElement('div');
        linhaContainer.classList.add('generos-linha');

        linha.forEach(nomeBotao => {
            const botao = document.createElement('button');
            botao.classList.add('botao-genero');

            if (nomeBotao === 'Nacionais') {
                botao.innerHTML = `Nacionais <img src="https://flagcdn.com/w20/br.png" alt="Bandeira do Brasil" class="flag-icon">`;
                botao.addEventListener('click', () => {
                    renderizarCards(dados.filter(d => d.br === true));
                    ultimoGeneroAtivo = 'Nacionais';
                    mostrandoFavoritos = false; // Garante que não estamos mais no modo favoritos
                    atualizarBotaoAtivo(botao);
                });
            } else if (nomeBotao === 'Todos') {
                botao.textContent = 'Todos';
                botao.classList.add('ativo'); // O botão "Todos" começa ativo
                botao.addEventListener('click', () => {
                    renderizarCards(dados);
                    ultimoGeneroAtivo = 'Todos';
                    mostrandoFavoritos = false; // Garante que não estamos mais no modo favoritos
                    atualizarBotaoAtivo(botao);
                });
            } else {
                botao.textContent = nomeBotao;
                botao.addEventListener('click', () => {
                    renderizarCards(dados.filter(d => d.genero === nomeBotao));
                    mostrandoFavoritos = false; // Garante que não estamos mais no modo favoritos
                    ultimoGeneroAtivo = nomeBotao;
                    atualizarBotaoAtivo(botao);
                });
            }
            linhaContainer.appendChild(botao);
        });
        secaoGeneros.appendChild(linhaContainer);
    });

    // Insere a seção de gêneros antes do container de cards
    mainElement.insertBefore(secaoGeneros, cardContainer);    
}

function renderizarCards(dados) {
    cardContainer.innerHTML = ""; // Limpa os cards antes de renderizar novamente

    if (dados.length === 0) {
        cardContainer.innerHTML = `<p class="mensagem-erro">Desculpe, nenhum livro foi encontrado para sua busca.</p>`;
        return;
    }

    for (let dado of dados) {
        let article = document.createElement("article");
        article.classList.add("card");
        const classeFavorito = dado.favorito ? 'favoritado' : '';

        // Adiciona a imagem da bandeira do Brasil se o livro for nacional
        const tituloHTML = dado.br ? `${dado.nome} <img src="https://flagcdn.com/w20/br.png" alt="Bandeira do Brasil" class="flag-icon">` : dado.nome;

        article.innerHTML = `
        <div class="card-header">
            <h2>${tituloHTML}</h2>
            <button class="botao-favorito ${classeFavorito}" data-nome="${dado.nome}">❤</button>
        </div>
        <div class="card-body">
            <p>⭐ Nota: ${dado.estrelas} (${dado.leitores})</p> 
            <p>${dado.genero} / ${dado.paginas} páginas / ${dado.ano} </p>
            <p>${dado.descricao}</p>
            <a href="${dado.link}" target = "_blank"> Leia mais...</a>
        </div>
        `
        cardContainer.appendChild(article);
    }

    // Adiciona os listeners para os botões de favorito
    document.querySelectorAll('.botao-favorito').forEach(button => {
        button.addEventListener('click', (e) => {
            const nomeLivro = e.target.dataset.nome;
            toggleFavorito(nomeLivro);
        });
    });
}

function toggleFavorito(nomeLivro) {
    const livro = dados.find(d => d.nome === nomeLivro);
    if (livro) {
        livro.favorito = !livro.favorito;
    }

    // Salva a lista atualizada de favoritos no localStorage
    const nomesFavoritos = dados.filter(d => d.favorito).map(d => d.nome);
    localStorage.setItem('favoritos', JSON.stringify(nomesFavoritos));

    // Re-renderiza os cards para refletir a mudança
    if (mostrandoFavoritos) {
        // Se estamos na tela de favoritos, re-renderiza apenas os favoritos
        renderizarCards(dados.filter(dado => dado.favorito));
    } else {
        // Se não, a busca ou o filtro de gênero já cuidam da re-renderização.
        // Apenas atualiza o card clicado.
        document.querySelector(`[data-nome="${nomeLivro}"]`).classList.toggle('favoritado');
    }
}

function criarSecaoRecomendacao() {
    const secaoRecomendacao = document.createElement('section');
    secaoRecomendacao.classList.add('recomendacao-container');

    secaoRecomendacao.innerHTML = `
        <h3>Não encontrou o livro desejado? Deixe sua recomendacao aqui:</h3>
        <div class="input-container">
            <input type="text" id="recomendacao-livro" placeholder="Digite o nome do livro">
            <button id="botao-enviar-recomendacao">Enviar</button>
        </div>
    `;

    // Adiciona a seção de recomendação ao final do elemento <main>
    const mainElement = document.querySelector('main');
    mainElement.appendChild(secaoRecomendacao);

    const botaoEnviar = document.getElementById('botao-enviar-recomendacao');
    const inputRecomendacao = document.getElementById('recomendacao-livro');

    // Adiciona o evento de clique ao botão de enviar
    botaoEnviar.addEventListener('click', () => {
        salvarRecomendacao(inputRecomendacao);
    });

    // Adiciona a funcionalidade de enviar com a tecla Enter
    inputRecomendacao.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            botaoEnviar.click();
        }
    });
}

function salvarRecomendacao(inputElement) {
    const recomendacao = inputElement.value.trim();

    // Conta o número de letras na recomendação
    const contagemDeLetras = (recomendacao.match(/[a-zA-Z]/g) || []).length;

    if (contagemDeLetras >= 3) {
        // Normaliza a recomendação para uma comparação robusta (ignora acentos e maiúsculas/minúsculas)
        const recomendacaoNormalizada = recomendacao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

        // Verifica se o livro já existe na base de dados principal ('dados')
        const livroJaExiste = dados.some(livro => 
            livro.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "") === recomendacaoNormalizada
        );

        if (livroJaExiste) {
            alert(`O livro "${recomendacao}" já faz parte da nossa biblioteca!`);
            return; // Interrompe a função para não salvar a recomendação
        }

        // Pega o objeto de recomendações existentes do localStorage
        const recomendacoesContador = JSON.parse(localStorage.getItem('recomendacoes')) || {};
        
        // Normaliza o nome da recomendação para usar como chave (lowercase)
        const chaveRecomendacao = recomendacao.toLowerCase();

        // Incrementa o contador para essa recomendação ou inicializa com 1
        recomendacoesContador[chaveRecomendacao] = (recomendacoesContador[chaveRecomendacao] || 0) + 1;

        // Salva o objeto atualizado de volta no localStorage
        localStorage.setItem('recomendacoes', JSON.stringify(recomendacoesContador));

        alert(`Obrigado pela sua recomendação: "${recomendacao}"!`);
        inputElement.value = ''; // Limpa o campo de texto
    } else {
        alert("Por favor, digite um livro válido");
    }
}

// --- FUNÇÃO DE ADMIN PARA APAGAR RECOMENDAÇÕES ---

/**
 * Apaga uma recomendação específica da lista salva no localStorage.
 * Esta função é exposta globalmente para ser chamada pelo console do navegador.
 * !!!!!!!!!!!!!!!Exemplo de uso no console: apagarRecomendacao("Nome do Livro a ser Removido");
 * @param {string} nomeDaRecomendacao - O nome exato da recomendação a ser apagada.
 */
function apagarRecomendacao(nomeDaRecomendacao) {
    const recomendacoesContador = JSON.parse(localStorage.getItem('recomendacoes')) || {};
    const chaveRecomendacao = nomeDaRecomendacao.toLowerCase();

    if (recomendacoesContador[chaveRecomendacao]) {
        // Diminui a contagem
        recomendacoesContador[chaveRecomendacao]--;

        // Se a contagem chegar a zero, remove o livro do objeto
        if (recomendacoesContador[chaveRecomendacao] === 0) {
            delete recomendacoesContador[chaveRecomendacao];
        }

        localStorage.setItem('recomendacoes', JSON.stringify(recomendacoesContador));
        console.log(`Uma ocorrência da recomendação "${nomeDaRecomendacao}" foi apagada.`);
        console.log("Para ver a lista atualizada, recarregue a página.");
    } else {
        console.log(`Erro: A recomendação "${nomeDaRecomendacao}" não foi encontrada.`);
    }
}

/**
 * Configura a funcionalidade do botão "Voltar ao Topo".
 */
function setupBotaoTopo() {
    const botaoTopo = document.createElement('button');
    botaoTopo.id = 'botao-topo';
    botaoTopo.innerHTML = '&#9650;'; // Seta para cima
    document.body.appendChild(botaoTopo);

    // Mostra ou esconde o botão com base na posição de rolagem
    window.onscroll = function() {
        if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
            botaoTopo.style.display = "block";
            botaoTopo.style.visibility = "visible";
            botaoTopo.style.opacity = "1";
        } else {
            botaoTopo.style.opacity = "0";
            botaoTopo.style.visibility = "hidden";
        }
    };

    // Ação de clique: rola a página suavemente para o topo
    botaoTopo.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}