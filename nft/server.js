// 引入所需的模块
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express(); // 创建 Express 应用程序
const PORT = 3001; // 指定服务器运行的端口号

// 中间件配置
app.use(cors()); // 允许跨域请求
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// MySQL 数据库连接配置
const connection = mysql.createConnection({
  host: "localhost", // 数据库主机名
  user: "root", // 数据库用户名
  password: "123456", // 数据库密码
  database: "mynft" // 数据库名称
});

// 连接到 MySQL 数据库
connection.connect(err => {
  if (err) {
    console.error('连接数据库时发生错误:', err); // 如果连接失败，则打印错误信息
    return;
  }
  console.log('已成功连接到 MySQL 数据库.'); // 连接成功后打印成功信息
});

// 创建 NFT 的 API 路由
app.post('/api/createNFT', (req, res) => {
  const { image, tokenId, name, author, owner, attributes, price, description, CID, status, leasestatus } = req.body;

  // 插入数据到 NFTs 表
  const query = `
    INSERT INTO NFTs (image, tokenId, name, author, owner, attributes, price, description, CID, status, leasestatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  connection.query(query, [image, tokenId, name, author, owner, JSON.stringify(attributes), price, description, CID, status, leasestatus], (err, result) => {
    if (err) {
      console.error('插入数据时发生错误:', err);
      return res.status(500).json({ message: '插入数据失败', error: err });
    }
    console.log('插入成功:', result);
    res.status(200).json({ message: 'NFT 创建成功', data: result });
  });
});

// 更新NFT owner的接口
app.post('/updateOwner', (req, res) => {
  const { id, newOwner } = req.body;

  if (!id || !newOwner) {
    return res.status(400).json({ error: "缺少必要参数" });
  }

  const query = "UPDATE NFTs SET owner = ? WHERE id = ?";
  connection.query(query, [newOwner, id], (err, results) => {
    if (err) {
      console.error("更新NFT owner时发生错误:", err);
      return res.status(500).json({ error: "更新失败" });
    }

    res.status(200).json({ success: true, message: "NFT owner更新成功" });
  });
});

// 更新NFT的价格和状态的接口
app.post('/updateNFTListing', (req, res) => {
  const { id, price, status } = req.body;

  if (!id || price === undefined || !status) {
    return res.status(400).json({ error: "缺少必要参数" });
  }

  // 更新NFT的价格和状态
  const query = `
    UPDATE NFTs SET price = ?, status = ? WHERE id = ?
  `;
  connection.query(query, [price, status, id], (err, result) => {
    if (err) {
      console.error("更新NFT时发生错误:", err);
      return res.status(500).json({ error: "更新失败" });
    }

    res.status(200).json({ success: true, message: "NFT信息更新成功" });
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
