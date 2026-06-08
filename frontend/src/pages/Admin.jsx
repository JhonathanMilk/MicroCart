import { useState, useEffect } from 'react';

export default function Admin({ user }) {
  const [aba, setAba] = useState('produtos'); // 'produtos' ou 'usuarios'
  
  // ESTADOS CADASTRO PRODUTO
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [prodDescription, setProdDescription] = useState(''); // 

  // ESTADOS GLOBAIS DE LISTAGEM
  const [produtos, setProdutos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [erroApi, setErroApi] = useState('');

  // ESTADOS DE EDIÇÃO DE PRODUTO 
  const [produtoEditandoId, setProdutoEditandoId] = useState(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdPrice, setEditProdPrice] = useState('');
  const [editProdStock, setEditProdStock] = useState('');
  const [editProdImage, setEditProdImage] = useState('');
  const [editProdDescription, setEditProdDescription] = useState(''); 

  // ESTADOS DE EDIÇÃO DE USUÁRIO
  const [usuarioEditandoId, setUsuarioEditandoId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [isSalvandoUser, setIsSalvandoUser] = useState(false);

  const token = localStorage.getItem('shop_token') || localStorage.getItem('token');

  // Carrega os dados dependendo da aba ativa
  useEffect(() => {
    if (user?.role === 'admin') {
      setErroApi('');
      
      if (aba === 'usuarios') {
        fetch('http://localhost:8080/api/v1/auth/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setUsuarios(data) : setErroApi('Erro ao carregar usuários.'))
        .catch(() => setErroApi('Falha de comunicação com Auth-Service.'));
      }
      
      if (aba === 'produtos') {
        fetch('http://localhost:8080/api/v1/products')
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setProdutos(data) : setErroApi('Erro ao carregar produtos.'))
        .catch(() => setErroApi('Falha de comunicação com Product-Service.'));
      }
    }
  }, [aba, user, token]);

  if (!user || user.role !== 'admin') {
    return <div style={{ textAlign: 'center', padding: '50px', color: '#e74c3c' }}><h2>⚠️ Acesso Restrito a Administradores!</h2></div>;
  }

  // CADASTRAR PRODUTO (POST) - CORRIGIDO
const handleCadastrarProduto = (e) => {
  e.preventDefault();
  const novoProduto = {
    name: prodName,
    price: parseFloat(prodPrice),
    stock: parseInt(prodStock) || 0,
    image: prodImage,
    description: prodDescription // Mantido corretamente
  };

  // 
  fetch('http://localhost:8080/api/v1/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(novoProduto)
  })
  .then(res => {
    if(res.ok) {
      alert("🛒 Produto adicionado com sucesso!");
      setProdName(''); setProdPrice(''); setProdStock(''); setProdImage(''); setProdDescription('');
      // Força recarga da lista de produtos
      setAba('usuarios'); setTimeout(() => setAba('produtos'), 10);
    }
  });
};

  // ABRIR GAVETA DE EDIÇÃO DO PRODUTO
  const abrirEdicaoProduto = (p) => {
    if (produtoEditandoId === p._id) {
      setProdutoEditandoId(null);
    } else {
      setProdutoEditandoId(p._id);
      setEditProdName(p.name);
      setEditProdPrice(p.price);
      setEditProdStock(p.stock || 0);
      setEditProdImage(p.image || '');
      setEditProdDescription(p.description || ''); 
    }
  };

  // SALVAR ALTERAÇÕES DO PRODUTO (PUT)
  const handleSalvarEdicaoProduto = (e, id) => {
    e.preventDefault();
    fetch(`http://localhost:8080/api/v1/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editProdName,
        price: parseFloat(editProdPrice),
        stock: parseInt(editProdStock),
        image: editProdImage,
        description: editProdDescription // 
      })
    })
    .then(res => {
      if (res.ok) {
        setProdutos(produtos.map(p => p._id === id ? { 
          ...p, 
          name: editProdName, 
          price: parseFloat(editProdPrice), 
          stock: parseInt(editProdStock), 
          image: editProdImage,
          description: editProdDescription 
        } : p));
        setProdutoEditandoId(null);
        alert("Produto atualizado no MongoDB!");
      } else {
        alert("Erro ao atualizar produto.");
      }
    });
  };

  // REMOVER PRODUTO (DELETE)
  const handleDeletarProduto = (id, nome) => {
    if (window.confirm(`Tem certeza que deseja remover o produto "${nome}" do catálogo?`)) {
      fetch(`http://localhost:8080/api/v1/products/${id}`, {
        method: 'DELETE'
      })
      .then(res => {
        if (res.ok) {
          setProdutos(produtos.filter(p => p._id !== id));
          alert("Produto removido com sucesso!");
        } else {
          alert("Erro ao deletar produto.");
        }
      });
    }
  };

  // SALVAR ALTERAÇÕES DO USUÁRIO
  const handleSalvarEdicaoUsuario = (e, id) => {
    e.preventDefault();
    setIsSalvandoUser(true);
    fetch(`http://localhost:8080/api/v1/auth/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: editName, role: editRole })
    })
    .then(res => {
      setIsSalvandoUser(false);
      if (res.ok) {
        setUsuarios(usuarios.map(u => u.id === id ? { ...u, name: editName, role: editRole } : u));
        setUsuarioEditandoId(null);
      }
    }).catch(() => setIsSalvandoUser(false));
  };

  return (
    <div style={{ maxWidth: '800px', margin: '30px auto', backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '15px' }}>👑 Painel Administrativo</h2>
      
      {/* Abas */}
      <div style={{ display: 'flex', gap: '20px', margin: '20px 0 30px 0' }}>
        <button onClick={() => setAba('produtos')} style={{ padding: '10px 20px', backgroundColor: aba === 'produtos' ? '#2c3e50' : '#f4f6f7', color: aba === 'produtos' ? '#fff' : '#333', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Gerenciar Vitrine (Mongo)</button>
        <button onClick={() => setAba('usuarios')} style={{ padding: '10px 20px', backgroundColor: aba === 'usuarios' ? '#2c3e50' : '#f4f6f7', color: aba === 'usuarios' ? '#fff' : '#333', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Gerenciar Perfis (Postgres)</button>
      </div>

      {/* ABA: PRODUTOS */}
      {aba === 'produtos' && (
        <div>
          {/* Form de Cadastro */}
          <form onSubmit={handleCadastrarProduto} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#fcfcfd', padding: '20px', borderRadius: '10px', border: '1px solid #eee', marginBottom: '30px' }}>
            <h4 style={{ margin: 0, color: '#2c3e50' }}>✨ Cadastrar Novo Produto</h4>
            <input type="text" placeholder="Nome do Produto" value={prodName} onChange={e => setProdName(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <input type="number" step="0.01" placeholder="Preço (R$)" value={prodPrice} onChange={e => setProdPrice(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd', flex: 1 }} />
              <input type="number" placeholder="Estoque Inicial" value={prodStock} onChange={e => setProdStock(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd', flex: 1 }} />
            </div>
            
            <input type="url" placeholder="URL da Imagem" value={prodImage} onChange={e => setProdImage(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }} />
            
            {/* Campo Textarea para a descrição do novo produto */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#666' }}>Descrição Detalhada do Produto</label>
              <textarea 
                placeholder="Escreva as especificações técnicas, detalhes e características do produto..." 
                value={prodDescription} 
                onChange={e => setProdDescription(e.target.value)} 
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd', height: '100px', resize: 'vertical', fontFamily: 'sans-serif' }} 
              />
            </div>

            <button type="submit" style={{ padding: '12px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar no MongoDB</button>
          </form>

          {/* Lista de Edição/Remoção */}
          <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>📦 Produtos na Vitrine</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {produtos.map(p => {
              const estaAberto = produtoEditandoId === p._id;
              return (
                <div key={p._id} style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', backgroundColor: estaAberto ? '#f8f9fa' : '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <img src={p.image} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', backgroundColor: '#eee' }} />
                      <div>
                        <strong>{p.name}</strong>
                        <span style={{ marginLeft: '10px', color: '#2ecc71', fontWeight: 'bold' }}>R$ {p.price.toFixed(2)}</span>
                        <span style={{ marginLeft: '10px', color: '#7f8c8d', fontSize: '0.9em' }}>({p.stock || 0} un)</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => abrirEdicaoProduto(p)} style={{ padding: '6px 12px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Editar</button>
                      <button onClick={() => handleDeletarProduto(p._id, p.name)} style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Excluir</button>
                    </div>
                  </div>

                  {/* GAVETA DE EDIÇÃO DO PRODUTO */}
                  {estaAberto && (
                    <form onSubmit={(e) => handleSalvarEdicaoProduto(e, p._id)} style={{ padding: '20px', borderTop: '1px solid #eee', backgroundColor: '#fdfdfd', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <div style={{ flex: 2 }}>
                          <label style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#666' }}>Nome</label>
                          <input type="text" value={editProdName} onChange={e => setEditProdName(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#666' }}>Preço (R$)</label>
                          <input type="number" step="0.01" value={editProdPrice} onChange={e => setEditProdPrice(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#666' }}>Estoque</label>
                          <input type="number" value={editProdStock} onChange={e => setEditProdStock(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                        </div>
                      </div>
                      
                      <div>
                        <label style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#666' }}>URL da Imagem</label>
                        <input type="url" value={editProdImage} onChange={e => setEditProdImage(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
                      </div>

                      {/* Campo Textarea para editar a descrição do produto já existente */}
                      <div>
                        <label style={{ fontSize: '0.85em', fontWeight: 'bold', color: '#666' }}>Descrição do Produto</label>
                        <textarea 
                          value={editProdDescription} 
                          onChange={e => setEditProdDescription(e.target.value)} 
                          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', height: '80px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'sans-serif' }} 
                        />
                      </div>

                      <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-end' }}>Atualizar Produto</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ABA: USUÁRIOS */}
      {aba === 'usuarios' && (
        <div>
          <h3>👥 Usuários Cadastrados no PostgreSQL</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {usuarios.map(u => {
              const estaAberto = usuarioEditandoId === u.id;
              return (
                <div key={u.id} style={{ border: '1px solid #eee', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px' }}>
                    <div>
                      <strong>{u.name}</strong> <span style={{ color: '#7f8c8d', fontSize: '0.9em' }}>({u.email})</span>
                      <span style={{ marginLeft: '12px', padding: '3px 8px', backgroundColor: u.role === 'admin' ? '#e74c3c' : '#3498db', color: '#fff', borderRadius: '4px', fontSize: '0.75em', fontWeight: 'bold' }}>{u.role.toUpperCase()}</span>
                    </div>
                    <button onClick={() => { setUsuarioEditandoId(estaAberto ? null : u.id); setEditName(u.name); setEditRole(u.role); }} style={{ padding: '8px 16px', backgroundColor: estaAberto ? '#7f8c8d' : '#f39c12', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{estaAberto ? 'Fechar X' : 'Editar ⚙️'}</button>
                  </div>
                  {estaAberto && (
                    <form onSubmit={(e) => handleSalvarEdicaoUsuario(e, u.id)} style={{ padding: '20px', borderTop: '1px solid #f1f1f1', backgroundColor: '#f8f9fa', display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 2 }}><input type="text" value={editName} onChange={e => setEditName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} /></div>
                      <div style={{ flex: 1 }}><select value={editRole} onChange={e => setEditRole(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', height: '38px' }}><option value="client">Client</option><option value="admin">Admin</option></select></div>
                      <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', height: '38px' }}>{isSalvandoUser ? '...' : 'Salvar'}</button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}