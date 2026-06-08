const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'minha_chave_secreta_super_segura'; 

app.use(express.json());
app.use(cors());

// Conexão com o MongoDB do Docker
mongoose.connect('mongodb://localhost:27017/products_db')
  .then(() => console.log("🍃 Conectado ao MongoDB com sucesso!"))
  .catch(err => console.error("Erro ao conectar no Mongo:", err));

// --- MIDDLEWARE DE PROTEÇÃO (GUARDIÃO) ---
const checkAuth = (req, res, next) => {
  const token = req.headers['authorization'];
  
  if (!token) {
    return res.status(401).json({ error: "Acesso negado. Token não fornecido." });
  }

  try {
    // Remove o "Bearer " enviado pelo padrão do navegador para isolar só o hash do token
    const cleanToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(cleanToken, JWT_SECRET);
    req.user = decoded; 
    next(); 
  } catch (err) {
    return res.status(403).json({ error: "Token inválido ou expirado." });
  }
};

// --- SCHEMA E MODELO DE PRODUTO ---
const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 }, 
  image: { type: String, required: false, default: 'https://www.autodeler.no/images/products/no_image_available.webp' },
  description: { type: String, required: false, default: '' }, 
  reviews: [
    {
      userEmail: { type: String, required: true },
      text: { type: String, required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      createdAt: { type: Date, default: Date.now }
    }
  ]
});

const Product = mongoose.model('Product', ProductSchema);

// --- SCHEMA E MODELO DE CARRINHO ---
const CartSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  items: [
    {
      productId: String,
      name: String,
      price: Number,
      quantity: Number
    }
  ]
});
const Cart = mongoose.model('Cart', CartSchema);

// --- ROTAS DE PRODUTOS ---
app.post('/products', async (req, res) => {
  try {
    const { name, price, stock, image, description } = req.body;

    console.log("📥 Recebendo dados para salvar no Mongo:", { name, price, stock, image, description });

    // Cria o documento no MongoDB com todas as informações
    const novoProduto = new Product({
      name,
      price,
      stock: stock !== undefined ? parseInt(stock) : 0,
      image: image && image.trim() !== "" ? image : 'https://www.autodeler.no/images/products/no_image_available.webp',
      description: description || '' 
    });

    await novoProduto.save();
    console.log("💾 Produto salvo com sucesso no MongoDB!");
    
    res.status(201).json(novoProduto);
  } catch (err) {
    console.error("❌ Erro ao salvar produto:", err.message);
    res.status(500).json({ error: "Erro interno ao salvar no banco de dados." });
  }
});

app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// BUSCAR UM PRODUTO ESPECÍFICO POR ID
app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // O Mongoose busca automaticamente usando o _id do formato hexadecimal
    const produto = await Product.findById(id); 
    
    if (!produto) {
      return res.status(404).json(null); // Retorna nulo para o React tratar como não encontrado
    }
    
    res.json(produto);
  } catch (error) {
    console.error("Erro ao buscar produto por ID:", error);
    res.status(500).json({ erro: "Erro interno no servidor de produtos." });
  }
});

// --- ROTA PARA EDITAR PRODUTO ---
app.put('/products/:id', async (req, res) => {
  try {
    const { name, price, stock, image, description } = req.body;
    
    const produtoAtualizado = await Product.findByIdAndUpdate(
      req.params.id,
      {
        name,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        image,
        description // Persistindo no banco
      },
      { returnDocument: 'after' } 
    );

    if (!produtoAtualizado) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    console.log(`✏️ Produto atualizado no Mongo com descrição: ${name}`);
    res.json(produtoAtualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar produto." });
  }
});

// --- ROTA PARA ADICIONAR COMENTÁRIO AO PRODUTO ---
app.post('/products/:id/review', async (req, res) => {
  try {
    const { userEmail, text, rating } = req.body;
    
    // Busca o produto e empurra o novo objeto para dentro do array 'reviews'
    const produto = await Product.findById(req.params.id);
    
    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    const novaReview = { userEmail, text, rating: Number(rating) };
    produto.reviews.push(novaReview);
    
    await produto.save();
    
    console.log(`💬 Novo comentário adicionado ao produto: ${produto.name}`);
    res.status(201).json(produto); // Retorna o produto já com o comentário inserido
  } catch (err) {
    res.status(500).json({ error: "Erro ao publicar comentário." });
  }
});

// --- ROTAPARA DAR BAIXA DE ESTOQUE NO MONGO ---
app.put('/products/:id/decrease-stock', async (req, res) => {
  try {
    const { quantidade } = req.body;
    const qteDiminuir = parseInt(quantidade) || 1;

    // Busca o produto atual para verificar se tem estoque disponível
    const produto = await Product.findById(req.params.id);
    
    if (!produto) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    // Verificação extra para não deixar o estoque ficar negativo
    if (produto.stock < qteDiminuir) {
      return res.status(400).json({ error: `Estoque insuficiente. Disponível: ${produto.stock}` });
    }

    // Executa a subtração de forma atômica no MongoDB usando o operador $inc
    produto.stock -= qteDiminuir;
    await produto.save();

    console.log(`📉 Estoque reduzido para o produto [${produto.name}]. Restam: ${produto.stock}`);
    res.json({ message: "Estoque atualizado com sucesso!", stock: produto.stock });
  } catch (err) {
    console.error("❌ Erro ao baixar estoque:", err);
    res.status(500).json({ error: "Erro interno ao atualizar o estoque." });
  }
});

// --- ROTA PARA DELETAR PRODUTO NO MONGO ---
app.delete('/products/:id', async (req, res) => {
  try {
    const produtoDeletado = await Product.findByIdAndDelete(req.params.id);
    
    if (!produtoDeletado) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    console.log(`🗑️ Produto deletado do Mongo: ${produtoDeletado.name}`);
    res.json({ message: "Produto removido com sucesso!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao deletar produto." });
  }
});

// --- ROTAS DE GERENCIAMENTO DO CARRINHO ---

// Salvar ou atualizar o carrinho
app.post('/cart', checkAuth, async (req, res) => { 
  const { userEmail, items } = req.body;
  try {
    const cart = await Cart.findOneAndUpdate(
      { userEmail },
      { items },
      { new: true, upsert: true }
    );
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Erro ao salvar o carrinho no banco." });
  }
});

// Buscar o carrinho salvo do usuário pelo e-mail
app.get('/cart/:email', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userEmail: req.params.email });
    if (!cart) {
      return res.json({ items: [] });
    }
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar o carrinho." });
  }
});

// --- ROTA DO SISTEMA DE RECOMENDAÇÃO ---
app.get('/products/:id/recommendations', async (req, res) => {
  try {
    const idProdutoAtual = req.params.id;

    // Busca os detalhes do produto ativo
    const produtoAtual = await Product.findById(idProdutoAtual);
    if (!produtoAtual) {
      return res.status(404).json({ error: "Produto base não encontrado." });
    }

    // Utilizando uma heurística para uma margem mais realista de e-commerce (60% para mais ou para menos)
    const precoMinimo = produtoAtual.price * 0.4;
    const precoMaximo = produtoAtual.price * 1.6;

    // Executa a busca baseada no preço ampliado
    let recomendados = await Product.find({
      _id: { $ne: idProdutoAtual }, // Regra de exclusão: nunca recomenda ele mesmo
      price: { $gte: precoMinimo, $lte: precoMaximo },
      stock: { $gt: 0 } // Só produtos com estoque
    })
    .limit(4)
    .select('name price image');

    // REGRA DE CONTINGÊNCIA (Fallback): Se mesmo com 60% ainda der 0 sugestões,
    // o sistema ignora o preço e traz qualquer outro item em estoque para a aba não ficar vazia!
    if (recomendados.length === 0) {
      console.log(`⚠️ Nenhuma recomendação estrita encontrada. Ativando contingência para [${produtoAtual.name}]`);
      recomendados = await Product.find({
        _id: { $ne: idProdutoAtual },
        stock: { $gt: 0 }
      })
      .limit(4)
      .select('name price image');
    }

    console.log(`🤖 Sistema de Recomendação: Geradas ${recomendados.length} sugestões para o produto ${produtoAtual.name}`);
    res.json(recomendados);

  } catch (err) {
    console.error("Erro no motor de recomendação:", err);
    res.status(500).json({ error: "Erro interno ao processar recomendações." });
  }
});

app.listen(PORT, () => console.log(`🚀 Product Service protegido com DB na porta ${PORT}`));