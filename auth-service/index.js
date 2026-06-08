const express = require('express');
const jwt = require('jsonwebtoken');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');

const app = express();
const PORT = 3002;
const JWT_SECRET = 'minha_chave_secreta_super_segura';

app.use(express.json());
app.use(cors());

// Conexão com o PostgreSQL do Docker
const sequelize = new Sequelize('auth_db', 'root', 'rootpassword', {
  host: 'localhost',
  dialect: 'postgres',
  logging: false
});

// 1. Definição do Modelo de Usuário
const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, allowNull: false, defaultValue: 'client' }, // 'client' ou 'admin'
});

// 2. Modelo de Endereços (Relação 1-N com o Usuário)
const Address = sequelize.define('Address', {
  userEmail: { type: DataTypes.STRING, allowNull: false },
  cep: { type: DataTypes.STRING, allowNull: false },
  rua: { type: DataTypes.STRING, allowNull: false },
  cidade: { type: DataTypes.STRING, allowNull: false }
});

// Sincroniza e cria o Admin automaticamente se o banco estiver zerado
sequelize.sync({ alter: true }).then(async () => {
  console.log("💾 Tabelas sincronizadas e atualizadas no PostgreSQL!");
  
  try {
    // Conta quantos usuários existem na tabela
    const totalUsuarios = await User.count();
    
    // Se não houver nenhum, injeta o administrador padrão
    if (totalUsuarios === 0) {
      console.log("🌱 Banco de credenciais vazio! Injetando administrador padrão...");
      
      await User.create({
        name: 'Administrador Mestre',
        email: 'admin@microcart.com',
        password: 'admin123', 
        role: 'admin' 
      });
      
      console.log("✅ Usuário admin@microcart.com criado com sucesso!");
    }
  } catch (error) {
    console.error("Erro ao verificar ou povoar o administrador inicial:", error);
  }
});

// ================= ROTAS DE AUTENTICAÇÃO E PERFIL PÚBLICO =================

// ROTA DE CADASTRO
app.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.create({ name, email, password });
    res.status(201).json({ message: "Usuário criado!", user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(400).json({ error: "Erro ao cadastrar usuário." });
  }
});

// ROTA DE LOGIN
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ where: { email } });

  if (user && user.password === password) {
    const token = jwt.sign({ email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ 
      message: "Autenticado!", 
      token, 
      user: { name: user.name, email: user.email, role: user.role } 
    });
  }
  return res.status(401).json({ error: "E-mail ou senha inválidos!" });
});

// ROTA PARA ATUALIZAR PERFIL (Por enquanto, apenas Nome e Senha - pelo próprio usuário)
app.put('/update-profile', async (req, res) => {
  const { email, name, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });

    user.name = name;
    if (password && password.trim() !== "") user.password = password;
    await user.save();

    res.json({ message: "Perfil updated!", name: user.name, email: user.email });
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar perfil." });
  }
});

// ================= ROTAS DE MÚLTIPLOS ENDEREÇOS =================

// Buscar todos os endereços salvos de um usuário
app.get('/addresses/:email', async (req, res) => {
  try {
    const addresses = await Address.findAll({ where: { userEmail: req.params.email } });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar endereços." });
  }
});

// Cadastrar um novo endereço para o usuário
app.post('/addresses', async (req, res) => {
  const { userEmail, cep, rua, cidade } = req.body;
  try {
    const newAddress = await Address.create({ userEmail, cep, rua, cidade });
    res.status(201).json(newAddress);
  } catch (err) {
    res.status(500).json({ error: "Erro ao cadastrar endereço." });
  }
});

// ================= ROTAS EXCLUSIVAS DE ADMINISTRADOR (PROTEGIDAS) =================

// Middleware de Barreira Admin
const verificarAdmin = (req, res, next) => {
  // Pega o cabeçalho de autorização
  const authHeader = req.headers['authorization'];
  console.log("Header recebido no Auth-Service:", authHeader); // <-- Log para rastreio no terminal

  if (!authHeader) {
    return res.status(401).json({ error: "Não autorizado. Cabeçalho ausente." });
  }

  // Extrai o token limpando espaços extras
  const token = authHeader.split(' ')[1] || authHeader;

  try {
    // Valida o Token usando a sua chave secreta
    const dados = jwt.verify(token, JWT_SECRET);
    console.log("Dados decodificados do JWT:", dados); // <-- Log para ver se a role é 'admin'

    if (dados.role !== 'admin') {
      return res.status(403).json({ error: "Acesso proibido. Apenas Administradores!" });
    }

    next(); // Passou na barreira! Pode ir para a rota.
  } catch (err) {
    console.log("Erro ao verificar JWT:", err.message);
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
};

// Rota para o Admin listar TODOS os usuários cadastrados no Postgres
app.get('/admin/users', verificarAdmin, async (req, res) => {
  const users = await User.findAll({ attributes: ['id', 'name', 'email', 'role'] });
  res.json(users);
});

// Rota para o Admin alterar os dados ou o cargo (role) de qualquer usuário
app.put('/admin/users/:id', verificarAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const { name, role } = req.body;
    user.name = name;
    user.role = role;
    await user.save();

    res.json({ message: "Usuário modificado pelo administrador!" });
  } catch {
    res.status(500).json({ error: "Erro ao modificar usuário." });
  }
});

app.listen(PORT, () => console.log(`🔑 Auth Service na porta ${PORT}`));