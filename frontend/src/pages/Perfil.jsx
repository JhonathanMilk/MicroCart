import { useState, useEffect } from 'react';

export default function Perfil({ user, setUser }) {
  // ESTADOS ORIGINAIS (Atualização de Cadastro)
  const [name, setName] = useState(user ? user.name : '');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ESTADOS DE ENDEREÇO (Gerenciamento com ViaCEP)
  const [enderecos, setEnderecos] = useState([]);
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState(''); // 🔥 NOVO
  const [complemento, setComplemento] = useState(''); // 🔥 NOVO
  const [cidade, setCidade] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [erroCep, setErroCep] = useState('');
  
  // Controla se o campo Rua é editável ou não
  const [ruaEditavel, setRuaEditavel] = useState(false);

  const token = localStorage.getItem('shop_token');

  // Busca os endereços cadastrados no Postgres ao carregar a página
  const carregarEnderecos = () => {
    if (user?.email) {
      fetch(`http://localhost:8080/api/v1/auth/addresses/${user.email}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setEnderecos(data);
        })
        .catch(err => console.error("Erro ao buscar endereços:", err));
    }
  };

  useEffect(() => {
    carregarEnderecos();
  }, [user]);

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '50px', fontFamily: 'sans-serif' }}>
        <h2 style={{ color: '#e74c3c' }}>Acesso Negado</h2>
        <p style={{ color: '#666' }}>Por favor, faça login para acessar seu perfil.</p>
      </div>
    );
  }

  // FUNÇÃO ORIGINAL: Atualizar dados de nome/senha
  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    fetch('http://localhost:8080/api/v1/auth/update-profile', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        email: user.email,
        name: name,
        password: password
      })
    })
    .then(res => {
      if (!res.ok) throw new Error('Erro ao atualizar os dados no servidor.');
      return res.json();
    })
    .then(updatedUserData => {
      const newUserState = { ...user, name: updatedUserData.name };
      setUser(newUserState);
      localStorage.setItem('shop_user', JSON.stringify(newUserState));
      
      setPassword('');
      setIsSaving(false);
      alert('Perfil updated no PostgreSQL! 🎉');
    })
    .catch(err => {
      alert(err.message);
      setIsSaving(false);
    });
  };

  // Captura o CEP e preenche automaticamente via ViaCEP
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
              setErroCep('🔍 CEP único para a cidade. Por favor, digite a rua.');
            }
          } else {
            setErroCep('❌ CEP não encontrado.');
            setCidade('');
          }
        })
        .catch(() => {
          setLoadingCep(false);
          setErroCep('⚠️ Erro ao consultar serviço de CEP.');
        });
    }
  };

  // Salvar o endereço combinando os novos campos na string da Rua
  const handleCadastrarEndereco = (e) => {
    e.preventDefault();

    if (!rua || !cidade || !numero) {
      alert("Por favor, preencha os dados obrigatórios (CEP e Número).");
      return;
    }

    // Junta Rua + Número + Complemento sem alterar o Back-end
    const ruaCompleta = `${rua}, № ${numero}${complemento.trim() ? ` (${complemento.trim()})` : ''}`;

    const novoEndereco = {
      userEmail: user.email,
      cep,
      rua: ruaCompleta,
      cidade
    };

    fetch('http://localhost:8080/api/v1/auth/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoEndereco)
    })
    .then(res => {
      if (res.ok) return res.json();
      throw new Error();
    })
    .then(dadosSalvos => {
      alert("🏠 Endereço adicionado!");
      setEnderecos([...enderecos, dadosSalvos]);
      // Limpa todo o formulário
      setCep(''); setRua(''); setCidade(''); setNumero(''); setComplemento('');
    })
    .catch(() => alert("Erro ao salvar endereço no banco de dados."));
  };

  // Deleta o endereço no PostgreSQL
  const handleDeletarEndereco = (id) => {
    if (window.confirm("Deseja realmente excluir permanentemente este endereço?")) {
      fetch(`http://localhost:8080/api/v1/auth/addresses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => {
        if (res.ok) {
          // Remove do estado local para sumir da tela instantaneamente
          setEnderecos(enderecos.filter(end => end.id !== id));
          alert("🏠 Endereço removido com sucesso!");
        } else {
          alert("Não foi possível remover o endereço. Verifique com o administrador.");
        }
      })
      .catch(err => console.error("Erro ao deletar endereço:", err));
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', backgroundColor: '#fff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', fontFamily: 'sans-serif' }}>
      
      {/* Cabeçalho */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ width: '80px', height: '80px', backgroundColor: '#3498db', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2em', fontWeight: 'bold', margin: '0 auto 15px' }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <h2 style={{ color: '#2c3e50', margin: '0' }}>Meu Perfil</h2>
        <p style={{ color: '#7f8c8d', margin: '5px 0 0' }}>Gerencie suas informações e endereços</p>
      </div>

      {/* FORMULÁRIO ORIGINAL DE DADOS CADASTRAIS */}
      <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderBottom: '2px solid #eee', paddingBottom: '30px', marginBottom: '30px' }}>
        <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '1.2em' }}>🔒 Dados da Conta</h3>
        
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e', fontSize: '0.9em' }}>E-mail (Não alterável)</label>
          <input type="email" value={user.email} disabled style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: '#f8f9fa', color: '#7f8c8d', boxSizing: 'border-box', cursor: 'not-allowed' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e', fontSize: '0.9em' }}>Nome Completo</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1em', boxSizing: 'border-box' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#34495e', fontSize: '0.9em' }}>Nova Senha</label>
          <input type="password" placeholder="Digite para alterar a senha" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1em', boxSizing: 'border-box' }} />
        </div>

        <button type="submit" disabled={isSaving} style={{ width: '100%', padding: '14px', backgroundColor: '#3498db', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1em', cursor: 'pointer' }}>
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </form>

      {/* FORMULÁRIO DE ENDEREÇOS COM VIA-CEP + NOVOS CAMPOS */}
      <form onSubmit={handleCadastrarEndereco} style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderBottom: '2px solid #eee', paddingBottom: '30px', marginBottom: '30px' }}>
        <h3 style={{ margin: '0', color: '#2c3e50', fontSize: '1.2em' }}>📍 Adicionar Novo Endereço</h3>
        
        <div>
          <label style={{ display: 'block', fontSize: '0.9em', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>CEP</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="text" 
              placeholder="00000-000" 
              maxLength="9"
              value={cep} 
              onChange={handleCepChange} 
              required 
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd', width: '140px', fontSize: '1em', textAlign: 'center', boxSizing: 'border-box' }} 
            />
            {loadingCep && <span style={{ color: '#3498db', fontSize: '0.9em', fontWeight: 'bold' }}>🔄 Buscando...</span>}
          </div>
          {erroCep && <p style={{ color: '#e74c3c', fontSize: '0.85em', margin: '5px 0 0 0', fontWeight: 'bold' }}>{erroCep}</p>}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9em', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>Rua / Bairro</label>
          <input 
            type="text" 
            placeholder={ruaEditavel ? "Digite a rua..." : "Preenchido automaticamente"} 
            value={rua} 
            onChange={e => setRua(e.target.value)} 
            required 
            disabled={!ruaEditavel} 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', backgroundColor: ruaEditavel ? '#fff' : '#f8f9fa', color: ruaEditavel ? '#333' : '#555' }} 
          />
        </div>

        {/* Número e Complemento */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.9em', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>Número</label>
            <input 
              type="text" 
              placeholder="Ex: 123" 
              value={numero} 
              onChange={e => setNumero(e.target.value)} 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '1em' }} 
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.9em', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>Complemento</label>
            <input 
              type="text" 
              placeholder="Apto, Bloco, Fundos (Opcional)" 
              value={complemento} 
              onChange={e => setComplemento(e.target.value)} 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '1em' }} 
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9em', fontWeight: 'bold', marginBottom: '5px', color: '#34495e' }}>Cidade / UF</label>
          <input type="text" placeholder="Preenchido automaticamente" value={cidade} required disabled style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', backgroundColor: '#f8f9fa', color: '#555' }} />
        </div>

        <button type="submit" disabled={loadingCep} style={{ width: '100%', padding: '14px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1em', cursor: 'pointer' }}>
          Salvar Endereço
        </button>
      </form>

      {/* LISTA DOS ENDEREÇOS SALVOS + BOTÃO EXCLUIR */}
      <div>
        <h3 style={{ color: '#2c3e50', fontSize: '1.2em', marginBottom: '15px' }}>🏠 Seus Endereços Cadastrados</h3>
        {enderecos.length === 0 ? (
          <p style={{ color: '#7f8c8d', fontSize: '0.9em', fontStyle: 'italic' }}>Nenhum endereço salvo para esta conta.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {enderecos.map((end, index) => (
              <div key={end.id || index} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fcfcfd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: 1, paddingRight: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <strong style={{ color: '#2c3e50' }}>Endereço #{index + 1}</strong>
                    <span style={{ fontSize: '0.85em', color: '#7f8c8d', fontWeight: 'bold' }}>CEP: {end.cep}</span>
                  </div>
                  <p style={{ margin: '5px 0 0 0', color: '#555', fontSize: '0.95em' }}><strong>Logradouro:</strong> {end.rua}</p>
                  <p style={{ margin: '3px 0 0 0', color: '#555', fontSize: '0.95em' }}><strong>Cidade:</strong> {end.cidade || end.city}</p>
                </div>
                
                {/* Botão de deletar endereço cadastrado */}
                <button 
                  type="button"
                  onClick={() => handleDeletarEndereco(end.id || end._id)}
                  style={{ backgroundColor: '#e74c3c', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.9em', cursor: 'pointer', transition: 'background-color 0.2s', alignSelf: 'center' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c0392b'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#e74c3c'}
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}