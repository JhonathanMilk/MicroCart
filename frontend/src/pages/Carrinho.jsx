import { useState, useEffect } from 'react';

export default function Carrinho({ user, cart, setCart }) {
  const [etapa, setEtapa] = useState(1); // 1: Revisar, 2: Endereço, 3: Pagamento, 4: Sucesso
  
  // Banco de endereços do usuário (PostgreSQL)
  const [listaEnderecos, setListaEnderecos] = useState([]);
  const [enderecoSelecionado, setEnderecoSelecionado] = useState(null);

  // Estado para guardar os IDs dos produtos selecionados para compra
  const [itensSelecionados, setItensSelecionados] = useState([]);

  // FORMULÁRIO DE NOVO ENDEREÇO (Com os novos campos e ViaCEP)
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState(''); 
  const [complemento, setComplemento] = useState(''); 
  const [cidade, setCidade] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [erroCep, setErroCep] = useState('');
  const [ruaEditavel, setRuaEditavel] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [isSalvando, setIsSalvando] = useState(false);

  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [cartaoNumero, setCartaoNumero] = useState('');
  const [isFinalizando, setIsFinalizando] = useState(false);
  
  // Estado para guardar o resumo da última compra efetuada com sucesso
  const [resumoCompra, setResumoCompra] = useState(null);

  // Carrega os endereços reais do PostgreSQL
  const carregarEnderecos = () => {
    if (user) {
      fetch(`http://localhost:8080/api/v1/auth/addresses/${user.email}`)
        .then(res => res.json())
        .then(data => {
          setListaEnderecos(data);
          if (data.length > 0) {
            setEnderecoSelecionado(data[0]);
          } else {
            setMostrarFormulario(true);
          }
        })
        .catch(err => console.error("Erro ao carregar endereços:", err));
    }
  };

  // Seleciona todos os produtos apenas quando o carrinho carrega pela primeira vez
  useEffect(() => {
    if (cart && cart.length > 0 && itensSelecionados.length === 0) {
      const todosIds = cart.map(item => item.productId || item.id || item._id);
      setItensSelecionados(todosIds);
    }
  }, [cart]);

  useEffect(() => {
    carregarEnderecos();
  }, [user]);

  // Alterna a seleção de um produto individualmente
  const toggleSelecaoProduto = (id) => {
    if (itensSelecionados.includes(id)) {
      setItensSelecionados(itensSelecionados.filter(itemId => itemId !== id));
    } else {
      setItensSelecionados([...itensSelecionados, id]);
    }
  };

  // Altera a quantidade e sincroniza direto com a função global do App.jsx
  const alterarQuantidadeItem = (id, novaQuantidade) => {
    if (novaQuantidade < 1) return; 
    if (!id) return;

    const novoCarrinho = cart.map(item => {
      const idUnico = item.productId || item.id || item._id;
      if (idUnico === id) {
        return { ...item, quantity: Number(novaQuantidade) };
      }
      return item;
    });
    
    setCart(novoCarrinho); 
  };

  // INTERCEPTADOR INTELIGENTE DE CEP
  const handleCepChange = (e) => {
    let v = e.target.value.replace(/\D/g, ''); 
    if (v.length > 5) {
      v = v.substring(0, 5) + '-' + v.substring(5, 8);
    }
    setCep(v);
    setErroCep('');
    setRua('');
    setRuaEditavel(false);

    const cepLimpo = v.replace('-', '');

    if (cepLimpo.length === 8) {
      setLoadingCep(true);
      fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
        .then(res => res.json())
        .then(dados => {
          setLoadingCep(false);
          if (!dados.erro) {
            setCidade(`${dados.localidade} - ${dados.uf}`);
            if (dados.logradouro && dados.logradouro.trim() !== "") {
              setRua(dados.logradouro);
              setRuaEditavel(false);
            } else {
              setRua('');
              setRuaEditavel(true);
              setErroCep('🔍 CEP geral da cidade. Por favor, digite o nome da rua e bairro.');
            }
          } else {
            setErroCep('❌ CEP não encontrado na base de dados.');
            setCidade('');
          }
        })
        .catch(() => {
          setLoadingCep(false);
          setErroCep('⚠️ Erro de conexão com o serviço de CEP.');
        });
    }
  };

  // Cadastra o endereço no banco de dados concatenando os novos campos
  const handleCadastrarEndereco = (e) => {
    e.preventDefault();
    if (!rua || !cidade || !numero) {
      alert("Por favor, preencha os dados obrigatórios (CEP e Número).");
      return;
    }
    setIsSalvando(true);
    const ruaCompleta = `${rua}, № ${numero}${complemento.trim() ? ` (${complemento.trim()})` : ''}`;

    fetch('http://localhost:8080/api/v1/auth/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: user.email, cep, rua: ruaCompleta, cidade })
    })
    .then(res => res.json())
    .then(novoEnd => {
      setListaEnderecos([...listaEnderecos, novoEnd]);
      setEnderecoSelecionado(novoEnd);
      setMostrarFormulario(false);
      setCep(''); setRua(''); setCidade(''); setNumero(''); setComplemento('');
      setIsSalvando(false);
    })
    .catch(() => setIsSalvando(false));
  };

  // Filtra os itens do carrinho que estão marcados para calcular o valor real do checkout
  const produtosParaComprar = cart ? cart.filter(item => 
    itensSelecionados.includes(item.productId || item.id || item._id)
  ) : [];

  // Valor total baseado estritamente nos selecionados
  const valorTotal = produtosParaComprar.reduce((total, item) => total + (item.price * item.quantity), 0);

  // Função principal modificada: Envia os dados de uma vez só para o order-service
  const handleFinalizarCompra = async () => {
    setIsFinalizando(true);

    try {
      // 🔥 AGORA CENTRALIZADO: O Front-end só faz uma única chamada para o endpoint correto de Orders via Gateway (Porta 8080)
      const respostaPedido = await fetch('http://localhost:8080/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: user.email,
          items: produtosParaComprar,
          total: valorTotal,
          paymentMethod: formaPagamento,
          address: {
            cep: enderecoSelecionado.cep,
            rua: enderecoSelecionado.rua,
            cidade: enderecoSelecionado.cidade
          }
        })
      });

      // Captura o json gerado pelo backend
      const dadosPedidoSalvo = await respostaPedido.json();

      if (!respostaPedido.ok) {
        // Exibe o aviso caso falte estoque no backend
        alert(`❌ Não foi possível concluir: ${dadosPedidoSalvo.error}`);
        return;
      }

      // Salva os dados retornados do order-service para exibir no resumo da Etapa 4
      setResumoCompra(dadosPedidoSalvo); 

      // Remove do carrinho apenas os produtos que foram efetivamente comprados
      const itensRestantes = cart.filter(item => {
        const idItem = item.productId || item.id || item._id;
        return !itensSelecionados.includes(idItem);
      });
      
      setCart(itensRestantes);
      setEtapa(4);

    } catch (error) {
      console.error("Erro ao processar compra:", error);
      alert("Houve um problema de conexão ao finalizar a compra. Tente novamente.");
    } finally {
      setIsFinalizando(false);
    }
  };

  if (!user) return <div style={{ textAlign: 'center', padding: '50px' }}><h2>Acesso Negado</h2></div>;

  return (
    <div style={{ maxWidth: '700px', margin: '30px auto', backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontFamily: 'sans-serif' }}>
      
      {/* Indicador de Etapas (Só aparece se não estiver na tela de sucesso) */}
      {etapa < 4 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '35px', borderBottom: '2px solid #f4f4f9', paddingBottom: '20px' }}>
          <span style={{ fontWeight: 'bold', color: etapa === 1 ? '#3498db' : '#95a5a6' }}>1. Revisar Itens</span>
          <span style={{ fontWeight: 'bold', color: etapa === 2 ? '#3498db' : '#95a5a6' }}>2. Endereço</span>
          <span style={{ fontWeight: 'bold', color: etapa === 3 ? '#3498db' : '#95a5a6' }}>3. Pagamento</span>
        </div>
      )}

      {(!cart || cart.length === 0) && etapa === 1 ? (
        <p style={{ textAlign: 'center', color: '#7f8c8d' }}>Carrinho vazio.</p>
      ) : (
        <div>
          {/* ================= ETAPA 1: REVISÃO + SELEÇÃO + QUANTIDADE ================= */}
          {etapa === 1 && (
            <div>
              <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>📋 Selecione o que deseja comprar hoje</h3>
              {cart.map(item => {
                const idUnico = item.productId || item.id || item._id;
                const estaMarcado = itensSelecionados.includes(idUnico);

                return (
                  <div key={idUnico} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 0', borderBottom: '1px solid #f4f4f9' }}>
                    <input 
                      type="checkbox" 
                      checked={estaMarcado} 
                      onChange={() => toggleSelecaoProduto(idUnico)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    
                    <div style={{ flex: 1, opacity: estaMarcado ? 1 : 0.5, transition: '0.2s' }}>
                      <span style={{ fontWeight: 'bold', color: '#333', display: 'block' }}>{item.name}</span>
                      <span style={{ fontSize: '0.9em', color: '#7f8c8d' }}>R$ {item.price.toFixed(2)} cada</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '15px' }}>
                      <button 
                        type="button"
                        onClick={() => alterarQuantidadeItem(idUnico, item.quantity - 1)}
                        style={{ width: '28px', height: '28px', backgroundColor: '#eef2f5', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                      >-</button>
                      <span style={{ width: '30px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                      <button 
                        type="button"
                        onClick={() => alterarQuantidadeItem(idUnico, item.quantity + 1)}
                        style={{ width: '28px', height: '28px', backgroundColor: '#eef2f5', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                      >+</button>
                    </div>

                    <span style={{ fontWeight: 'bold', color: '#2ecc71', opacity: estaMarcado ? 1 : 0.5, width: '90px', textAlign: 'right' }}>
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', fontSize: '1.3em', fontWeight: 'bold' }}>
                <span>Total Selecionado:</span>
                <span style={{ color: '#2ecc71' }}>R$ {valorTotal.toFixed(2)}</span>
              </div>

              <button 
                type="button"
                onClick={() => setEtapa(2)} 
                disabled={produtosParaComprar.length === 0}
                style={{ width: '100%', marginTop: '30px', padding: '14px', backgroundColor: produtosParaComprar.length > 0 ? '#3498db' : '#bdc3c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: produtosParaComprar.length > 0 ? 'pointer' : 'not-allowed' }}
              >
                {produtosParaComprar.length > 0 ? "Prosseguir com a Compra ➡️" : "Selecione ao menos 1 item"}
              </button>
            </div>
          )}

          {/* ================= ETAPA 2: ENDEREÇO ================= */}
          {etapa === 2 && (
            <div>
              <h3 style={{ color: '#2c3e50', marginBottom: '5px' }}>📍 Selecione o Endereço de Entrega</h3>
              <p style={{ fontSize: '0.85em', color: '#7f8c8d', margin: '0 0 20px 0', backgroundColor: '#fdf8e2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f5ebd0', display: 'inline-block' }}>
                💡 <strong>Dica:</strong> Para editar ou remover endereços permanentemente, acesse a página de <strong>Perfil</strong>.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {listaEnderecos.map(end => {
                  const idEnd = end.id || end._id;
                  const idSel = enderecoSelecionado?.id || enderecoSelecionado?._id;
                  const isSelected = idEnd && idSel && idEnd === idSel;

                  return (
                    <div 
                      key={idEnd || Math.random().toString()} 
                      onClick={() => setEnderecoSelecionado(end)}
                      style={{ padding: '15px', borderRadius: '10px', border: isSelected ? '2px solid #3498db' : '1px solid #ddd', backgroundColor: isSelected ? '#f7faff' : '#fff', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', gap: '15px' }}
                    >
                      <input 
                        type="radio" 
                        checked={isSelected || false} 
                        onChange={() => setEnderecoSelecionado(end)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: '#333', display: 'block' }}>{end.rua}</strong>
                        <span style={{ fontSize: '0.9em', color: '#666' }}>{end.cidade || end.city} - CEP: {end.cep}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                type="button"
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
                style={{ background: 'none', border: 'none', color: '#3498db', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', marginBottom: '25px', padding: '0' }}
              >
                {mostrarFormulario ? "➕ Cancelar novo endereço" : "➕ Entregar em um novo endereço"}
              </button>

              {/* FORMULÁRIO COM PREENCHIMENTO DO VIA-CEP */}
              {mostrarFormulario && (
                <form onSubmit={handleCadastrarEndereco} style={{ backgroundColor: '#f8f9fa', padding: '25px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h4 style={{ margin: '0', color: '#2c3e50' }}>🏠 Novo Endereço de Entrega</h4>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input type="text" placeholder="CEP (00000-000)" maxLength="9" value={cep} onChange={handleCepChange} required style={{ padding: '11px', borderRadius: '6px', border: '1px solid #ddd', width: '150px', fontSize: '0.95em', textAlign: 'center' }} />
                      {loadingCep && <span style={{ color: '#3498db', fontSize: '0.9em', fontWeight: 'bold' }}>🔄 Buscando...</span>}
                    </div>
                    {erroCep && <p style={{ color: '#e74c3c', fontSize: '0.85em', margin: '5px 0 0 0', fontWeight: 'bold' }}>{erroCep}</p>}
                  </div>

                  <input type="text" placeholder={ruaEditavel ? "Digite o nome da rua..." : "Aguardando CEP..."} value={rua} onChange={e => setRua(e.target.value)} required disabled={!ruaEditavel} style={{ padding: '11px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: ruaEditavel ? '#fff' : '#eef2f5', color: '#333' }} />

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <input type="text" placeholder="Número" value={numero} onChange={e => setNumero(e.target.value)} required style={{ width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 2 }}>
                      <input type="text" placeholder="Complemento (Opcional)" value={complemento} onChange={e => setComplemento(e.target.value)} style={{ width: '100%', padding: '11px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  <input type="text" placeholder="Cidade - UF" value={cidade} required disabled style={{ padding: '11px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#eef2f5', color: '#555' }} />

                  <button type="submit" disabled={isSalvando || loadingCep} style={{ padding: '12px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                    {isSalvando ? 'Salvando...' : 'Salvar e Usar este Endereço'}
                  </button>
                </form>
              )}

              <div style={{ display: 'flex', gap: '15px' }}>
                <button type="button" onClick={() => setEtapa(1)} style={{ width: '30%', padding: '12px', backgroundColor: '#fff', color: '#7f8c8d', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer' }}>Voltar</button>
                <button type="button" onClick={() => setEtapa(3)} disabled={!enderecoSelecionado} style={{ width: '70%', padding: '12px', backgroundColor: enderecoSelecionado ? '#3498db' : '#bdc3c7', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: enderecoSelecionado ? 'pointer' : 'not-allowed' }}>Ir para o Pagamento ➡️</button>
              </div>
            </div>
          )}

          {/* ================= ETAPA 3: PAGAMENTO RESUMIDO ================= */}
          {etapa === 3 && (
            <div>
              <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>💳 Forma de Pagamento</h3>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                <label style={{ flex: 1, padding: '15px', border: formaPagamento === 'pix' ? '2px solid #2ecc71' : '1px solid #ddd', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input type="radio" checked={formaPagamento === 'pix'} onChange={() => setFormaPagamento('pix')} style={{ marginRight: '8px' }} /> ⚡ PIX
                </label>
                <label style={{ flex: 1, padding: '15px', border: formaPagamento === 'cartao' ? '2px solid #2ecc71' : '1px solid #ddd', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
                  <input type="radio" checked={formaPagamento === 'cartao'} onChange={() => setFormaPagamento('cartao')} style={{ marginRight: '8px' }} /> 💳 Cartão
                </label>
              </div>

              {formaPagamento === 'cartao' && (
                <input type="text" placeholder="Número do Cartão" value={cartaoNumero} onChange={e => setCartaoNumero(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', marginBottom: '20px' }} />
              )}

              <div style={{ backgroundColor: '#f4f6f7', padding: '20px', borderRadius: '8px', marginBottom: '25px' }}>
                <p style={{ margin: '0 0 5px 0', color: '#7f8c8d' }}>Destino: <strong>{enderecoSelecionado?.rua}, {enderecoSelecionado?.cidade}</strong></p>
                <p style={{ margin: '0 0 15px 0', color: '#7f8c8d', fontSize: '0.9em' }}>Comprando <strong>{produtosParaComprar.length}</strong> produtos.</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold' }}>
                  <span>Total do Pedido:</span>
                  <span style={{ color: '#2ecc71' }}>R$ {valorTotal.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button type="button" onClick={() => setEtapa(2)} disabled={isFinalizando} style={{ width: '30%', padding: '14px', backgroundColor: '#fff', color: '#7f8c8d', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer' }}>Voltar</button>
                <button type="button" onClick={handleFinalizarCompra} disabled={isFinalizando} style={{ width: '70%', padding: '14px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isFinalizando ? 'Processando...' : '🎉 Concluir e Pagar'}
                </button>
              </div>
            </div>
          )}

          {/* ================= ETAPA 4: TELA DE SUCESSO REAL (CORRIGIDA) ================= */}
          {etapa === 4 && resumoCompra && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '50px', marginBottom: '15px' }}>🎉</div>
              <h2 style={{ color: '#2ecc71', margin: '0 0 10px 0' }}>Compra Efetuada com Sucesso!</h2>
              <p style={{ color: '#7f8c8d', marginTop: '0', marginBottom: '30px' }}>Obrigado por comprar na MicroCart. Seu pedido já está sendo preparado!</p>

              {/* Box de Resumo */}
              <div style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', padding: '25px', textAlign: 'left', border: '1px solid #eee', marginBottom: '30px' }}>
                <h4 style={{ color: '#2c3e50', margin: '0 0 15px 0', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>📦 Resumo do Pedido</h4>
                
                {/* lendo de resumoCompra.items */}
                <div style={{ marginBottom: '20px' }}>
                  {resumoCompra.items && resumoCompra.items.map(item => (
                    <div key={item.productId || item._id || item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95em', marginBottom: '8px', color: '#555' }}>
                      <span>{item.name} <strong style={{ color: '#7f8c8d' }}>(x{item.quantity})</strong></span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* lendo de resumoCompra.address e resumoCompra.paymentMethod */}
                <div style={{ fontSize: '0.9em', color: '#7f8c8d', borderTop: '1px solid #eee', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <p style={{ margin: 0 }}>
                    📍 <strong>Entrega:</strong> {resumoCompra.address?.rua || resumoCompra.endereco?.rua}
                  </p>
                  <p style={{ margin: 0 }}>
                    🏙️ <strong>Cidade:</strong> {resumoCompra.address?.cidade || resumoCompra.endereco?.cidade}
                  </p>
                  <p style={{ margin: 0 }}>
                    💳 <strong>Forma de Pagamento:</strong> {(resumoCompra.paymentMethod || resumoCompra.pagamento || '').toUpperCase()}
                  </p>
                </div>

                {/* Total Final */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold', marginTop: '20px', borderTop: '2px dashed #ddd', paddingTop: '15px' }}>
                  <span style={{ color: '#2c3e50' }}>Total Pago:</span>
                  <span style={{ color: '#2ecc71' }}>R$ {resumoCompra.total?.toFixed(2)}</span>
                </div>
              </div>

              {/* Botão para voltar à Vitrine */}
              <button 
                type="button"
                onClick={() => setEtapa(1)} 
                style={{ padding: '14px 30px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em', transition: '0.2s' }}
              >
                🛍️ Voltar para a Vitrine
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}