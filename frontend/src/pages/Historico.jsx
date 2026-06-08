import { useState, useEffect } from 'react';

export default function Historico({ user }) {
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetch(`http://localhost:8080/api/v1/orders/${user.email}`)
        .then(res => res.json())
        .then(data => {
          setPedidos(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Erro ao carregar histórico:", err);
          setLoading(false);
        });
    }
  }, [user]);

  if (!user) return <div style={{ textAlign: 'center', padding: '50px' }}><h2>Acesso Negado. Faça Login.</h2></div>;
  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}><h3>Carregando seu histórico...</h3></div>;

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>🛍️ Meu Histórico de Compras</h2>

      {pedidos.length === 0 ? (
        <p style={{ color: '#7f8c8d', backgroundColor: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>Você ainda não realizou nenhuma compra.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {pedidos.map(pedido => (
            <div 
              key={pedido._id} 
              onClick={() => setPedidoSelecionado(pedido)}
              style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)', border: '1px solid #eee', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: '0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#3498db'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#eee'}
            >
              <div>
                <span style={{ fontSize: '0.85em', color: '#95a5a6', display: 'block' }}>PEDIDO: {pedido._id.substring(0, 8).toUpperCase()}...</span>
                <strong style={{ color: '#2c3e50', fontSize: '1.1em' }}>
                  {pedido.items.length} {pedido.items.length === 1 ? 'produto' : 'produtos'}
                </strong>
                <span style={{ fontSize: '0.9em', color: '#7f8c8d', display: 'block', marginTop: '4px' }}>
                  Feito em: {new Date(pedido.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 'bold', color: '#2ecc71', display: 'block', fontSize: '1.1em' }}>
                  R$ {pedido.total.toFixed(2)}
                </span>
                <span style={{ 
                  fontSize: '0.85em', 
                  fontWeight: 'bold', 
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  backgroundColor: pedido.status === 'Preparando para Envio' ? '#fdf8e2' : '#e8f8f5', 
                  color: pedido.status === 'Preparando para Envio' ? '#f39c12' : '#2ecc71',
                  display: 'inline-block',
                  marginTop: '6px'
                }}>
                  {pedido.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================= MODAL DE DETALHES DO PEDIDO ================= */}
      {pedidoSelecionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '16px', maxWidth: '500px', width: '90%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>📦 Detalhes do Pedido</h3>
              <button onClick={() => setPedidoSelecionado(null)} style={{ background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#95a5a6' }}>&times;</button>
            </div>

            {/* Informações de Status e Rastreamento */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
              <p style={{ margin: '0 0 8px 0' }}>Status: <strong style={{ color: '#f39c12' }}>{pedidoSelecionado.status}</strong></p>
              <p style={{ margin: 0 }}>Código de Rastreio: <strong style={{ color: '#3498db', fontFamily: 'monospace' }}>{pedidoSelecionado.trackingCode}</strong></p>
            </div>

            {/* Lista de Itens do Pedido */}
            <h4 style={{ color: '#34495e', margin: '0 0 10px 0' }}>Itens Comprados</h4>
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '15px' }}>
              {pedidoSelecionado.items.map(item => (
                <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95em', marginBottom: '8px', color: '#555' }}>
                  <span>{item.name} <strong style={{ color: '#7f8c8d' }}>(x{item.quantity})</strong></span>
                  <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Detalhes do Envio e Pagamento */}
            <h4 style={{ color: '#34495e', margin: '0 0 10px 0' }}>Informações de Entrega</h4>
            <div style={{ fontSize: '0.9em', color: '#7f8c8d', marginBottom: '20px', lineHeight: '1.4' }}>
              <p style={{ margin: '0 0 4px 0' }}>📍 {pedidoSelecionado.address.rua}</p>
              <p style={{ margin: '0 0 4px 0' }}>🏙️ {pedidoSelecionado.address.cidade} - CEP: {pedidoSelecionado.address.cep}</p>
              <p style={{ margin: '12px 0 0 0' }}>💳 Pagamento via: <strong>{pedidoSelecionado.paymentMethod.toUpperCase()}</strong></p>
            </div>

            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2em', fontWeight: 'bold', borderTop: '2px dashed #eee', paddingTop: '15px' }}>
              <span>Total Pago:</span>
              <span style={{ color: '#2ecc71' }}>R$ {pedidoSelecionado.total.toFixed(2)}</span>
            </div>

            <button 
              onClick={() => setPedidoSelecionado(null)}
              style={{ width: '100%', marginTop: '25px', padding: '12px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}