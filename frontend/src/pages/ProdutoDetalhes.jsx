import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function ProdutoDetalhes({ addToCart, user }) {
  const { id } = useParams();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // 🔥 NOVO: Estado para armazenar os produtos sugeridos pelo motor de recomendação
  const [recomendacoes, setRecomendacoes] = useState([]);

  // Estados locais para o formulário de novos comentários
  const [novoComentario, setNovoComentario] = useState('');
  const [nota, setNota] = useState(5);
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    // 1. Busca os detalhes do produto principal
    fetch(`http://localhost:8080/api/v1/products/${id}`)
      .then(res => res.json())
      .then(data => {
        setProduto(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Erro ao buscar detalhes do produto:", err);
        setLoading(false);
      });

    // 🔥 NOVO: 2. Consulta o endpoint do Sistema de Recomendação via Gateway
    fetch(`http://localhost:8080/api/v1/products/${id}/recommendations`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRecomendacoes(data);
        }
      })
      .catch(err => console.error("Erro ao carregar sistema de recomendações:", err));

  }, [id]);

  // Função para enviar o comentário ao backend
  const handleEnviarComentario = (e) => {
    e.preventDefault();
    if (!novoComentario.trim()) return;

    setEnviandoComentario(true);

    fetch(`http://localhost:8080/api/v1/products/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: user.email,
        text: novoComentario,
        rating: nota
      })
    })
    .then(res => res.json())
    .then(produtoAtualizado => {
      setProduto(produtoAtualizado); 
      setNovoComentario(''); 
      setNota(5); 
      setEnviandoComentario(false);
    })
    .catch(err => {
      console.error("Erro ao enviar comentário:", err);
      setEnviandoComentario(false);
      alert("Erro ao publicar comentário.");
    });
  };

  const handleImageError = (e) => {
    e.target.onerror = null; 
    e.target.src = 'https://www.autodeler.no/images/products/no_image_available.webp';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
        <h2>🔄 Carregando detalhes do produto...</h2>
      </div>
    );
  }

  if (!produto) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
        <h2>❌ Produto não encontrado</h2>
        <Link to="/" style={{ color: '#006cc5', textDecoration: 'none', fontWeight: 'bold' }}>Voltar para a Vitrine</Link>
      </div>
    );
  }

  const isEsgotado = produto.stock <= 0;
  const imagemFinal = produto.image && produto.image.trim() !== "" ? produto.image : 'https://www.autodeler.no/images/products/no_image_available.webp';
  const listaReviews = produto.reviews || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '30px auto', backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontFamily: 'sans-serif' }}>
      
      <Link to="/" style={{ textDecoration: 'none', color: '#006cc5', fontWeight: '600', display: 'inline-block', marginBottom: '25px' }}>
        ← Voltar para a vitrine
      </Link>

      {/* Grid Superior: Imagem e Informações Comerciais */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: '#f8f9fa', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', minHeight: '350px', border: '1px solid #eee', overflow: 'hidden' }}>
          <img src={imagemFinal} alt={produto.name} onError={handleImageError} style={{ maxWidth: '100%', maxHeight: '350px', objectFit: 'contain', filter: isEsgotado ? 'grayscale(100%)' : 'none' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <span style={{ backgroundColor: '#eef2f7', color: '#006cc5', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8em', fontWeight: 'bold' }}>MicroCart Store</span>
            <h1 style={{ color: '#2c3e50', margin: '10px 0 15px 0', fontSize: '2em', lineHeight: '1.2' }}>{produto.name}</h1>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.9em', color: !isEsgotado ? '#2ecc71' : '#e74c3c', fontWeight: '600' }}>
              {!isEsgotado ? `✔️ Em estoque (${produto.stock} unidades disponíveis)` : '❌ Esgotado'}
            </p>
            <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />
            <div style={{ marginBottom: '25px' }}>
              <span style={{ fontSize: '0.9em', color: '#7f8c8d', display: 'block' }}>Preço exclusivo:</span>
              <span style={{ fontSize: '2.3em', fontWeight: '800', color: '#2ecc71' }}>R$ {produto.price.toFixed(2)}</span>
            </div>
          </div>

          <button onClick={() => addToCart(produto)} disabled={isEsgotado} style={{ width: '100%', padding: '16px', backgroundColor: !isEsgotado ? '#006cc5' : '#bdc3c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1.1em', fontWeight: 'bold', cursor: !isEsgotado ? 'pointer' : 'not-allowed', transition: '0.2s' }}>
            {!isEsgotado ? '🛒 Adicionar ao Carrinho' : 'Produto Esgotado'}
          </button>
        </div>
      </div>

      {/* Descrição do Produto */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '30px', marginBottom: '40px' }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>📋 Descrição do Produto</h3>
        <p style={{ color: '#555', lineHeight: '1.6', fontSize: '1em', margin: 0, whiteSpace: 'pre-line' }}>{produto.description || "Nenhuma descrição detalhada informada."}</p>
      </div>

      {/* SEÇÃO VISUAL DO SISTEMA DE RECOMENDAÇÃO */}
      {recomendacoes.length > 0 && (
        <div style={{ borderTop: '1px solid #eee', paddingTop: '30px', marginBottom: '40px' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '20px' }}>🤖 Quem viu este item também se interessou por:</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
            {recomendacoes.map((item) => (
              <Link 
                key={item._id} 
                to={`/produto/${item._id}`} 
                style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #eee', transition: '0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', backgroundColor: '#fff', borderRadius: '6px', padding: '5px' }}>
                  <img src={item.image || 'https://www.autodeler.no/images/products/no_image_available.webp'} onError={handleImageError} alt={item.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95em', color: '#2c3e50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h4>
                <span style={{ fontWeight: 'bold', color: '#2ecc71', fontSize: '1.1em' }}>R$ {item.price.toFixed(2)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* SEÇÃO DE AVALIAÇÕES */}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '30px', backgroundColor: '#fafbfc', padding: '25px', borderRadius: '12px' }}>
        <h3 style={{ color: '#2c3e50', margin: '0 0 15px 0' }}>💬 Avaliações dos Clientes ({listaReviews.length})</h3>
        
        {listaReviews.length === 0 ? (
          <p style={{ color: '#7f8c8d', fontSize: '0.9em', margin: '0 0 25px 0' }}>Nenhuma avaliação para este produto ainda. Seja o primeiro a comentar!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
            {listaReviews.map((rev, index) => (
              <div key={rev._id || index} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.88em' }}>
                  <strong style={{ color: '#34495e' }}>👤 {rev.userEmail}</strong>
                  <span style={{ color: '#f1c40f', fontWeight: 'bold' }}>{"⭐".repeat(rev.rating)} ({rev.rating}/5)</span>
                </div>
                <p style={{ margin: 0, color: '#555', fontSize: '0.95em', lineHeight: '1.4' }}>{rev.text}</p>
              </div>
            ))}
          </div>
        )}

        {user ? (
          <form onSubmit={handleEnviarComentario} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, color: '#34495e' }}>Deixe sua opinião:</h4>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '0.9em', color: '#666', fontWeight: 'bold' }}>Sua nota para o produto:</label>
              <select value={nota} onChange={e => setNota(Number(e.target.value))} style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', fontWeight: 'bold', color: '#f39c12' }}>
                <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
                <option value="4">⭐⭐⭐⭐ (4/5)</option>
                <option value="3">⭐⭐⭐ (3/5)</option>
                <option value="2">⭐⭐ (2/5)</option>
                <option value="1">⭐ (1/5)</option>
              </select>
            </div>

            <textarea 
              placeholder="Escreva sua opinião sincera sobre o produto, pontos positivos e negativos..." 
              value={novoComentario} 
              onChange={e => setNovoComentario(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', height: '90px', resize: 'vertical', fontFamily: 'sans-serif' }}
            />
            
            <button type="submit" disabled={enviandoComentario} style={{ padding: '10px 20px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start', transition: '0.2s' }}>
              {enviandoComentario ? 'Publicando...' : 'Enviar Comentário 🚀'}
            </button>
          </form>
        ) : (
          <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '15px', borderRadius: '6px', fontSize: '0.9em', textAlign: 'center' }}>
            🔒 Você precisa estar <Link to="/login" style={{ color: '#856404', fontWeight: 'bold' }}>logado</Link> para fazer uma avaliação deste produto.
          </div>
        )}
      </div>

    </div>
  );
}