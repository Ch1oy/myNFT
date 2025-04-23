// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol"; // 导入 ERC721 标准合约
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol"; // 导入 ERC721 可枚举扩展
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol"; // 导入 ERC721 URI 存储扩展
import "@openzeppelin/contracts/access/Ownable.sol"; // 导入 Ownable 合约，用于所有权控制
import "@openzeppelin/contracts/utils/Counters.sol"; // 导入 Counters 库，用于计数操作
import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; // 导入防重入攻击的 ReentrancyGuard 合约

contract YourCollectible is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter; // 使用 Counters 库进行计数操作

    Counters.Counter public tokenIdCounter; // 用于跟踪令牌 ID 的计数器
    mapping(uint256 => uint256) public tokenPrices; // 用于存储令牌价格的映射

    // 版税机制相关
    mapping(uint256 => address) private _creators; // 存储每个tokenId的创作者地址
    uint256 public royaltyPercentage = 10; // 版税百分比，默认设置为10%

    // 租赁信息结构体
    struct Rental {
    address owner;      // 当前NFT所有者地址
    address renter;     // 租用者地址
    uint256 rentPrice;  // 租金
    uint256 startTime;  // 租赁开始时间
    uint256 duration;   // 租赁时长
    bool active;        // 是否处于激活状态
}

    mapping(uint256 => Rental) public rentals; // 每个 tokenId 对应的租赁信息

    // 交易历史记录结构体
    struct TransactionHistory {
        address seller; // 卖家地址
        address buyer; // 买家地址
        uint256 price; // 交易价格
        uint256 timestamp; // 交易时间戳
    }

    mapping(uint256 => TransactionHistory[]) public tokenTransactionHistory; // 每个 tokenId 对应的交易历史记录

    // 拍卖相关结构体和映射
    struct Auction {
        uint256 tokenId;
        uint256 minPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool active;
    }

    mapping(uint256 => Auction) public auctions; // 每个 tokenId 对应的拍卖信息


    // 盲盒价格和可用NFT列表
    uint256 public mysteryBoxPrice = 0.1 ether; // 盲盒价格
    uint256[] public availableTokens; // 可供选择的NFT tokenId列表

    // 构造函数，初始化合约并设置合约名称和代币符号
    constructor() ERC721("YourCollectible", "ETH") {}

    // ========================= 盲盒相关功能 =========================

    // 设置盲盒价格
    function setMysteryBoxPrice(uint256 price) public onlyOwner {
        mysteryBoxPrice = price; // 设置新的盲盒价格
    }

    // 添加可供选择的NFT到盲盒
  function addAvailableToken(uint256 tokenId) public {
    require(ownerOf(tokenId) == msg.sender, "Only the token owner can add it to the mystery box");
    availableTokens.push(tokenId);
}

    // 获取盲盒中的所有NFT ID
    function getMysteryBoxTokens() public view returns (uint256[] memory) {
        return availableTokens; // 返回可用的tokenId列表
    }

    // 定义事件
    event MysteryBoxPurchased(address indexed buyer, uint256 tokenId);

    // 随机从盲盒中获取NFT
    function buyMysteryBox() public payable returns (uint256) {
        require(msg.value == mysteryBoxPrice, "Incorrect price"); // 确保支付的价格正确
        require(availableTokens.length > 0, "No available NFTs"); // 确保有可用的NFT

        // 随机选择一个NFT
        uint256 randomIndex = uint256(
            keccak256(abi.encodePacked(block.timestamp, msg.sender))
        ) % availableTokens.length;
        uint256 tokenId = availableTokens[randomIndex];

        // 从可用列表中移除该NFT
        availableTokens[randomIndex] = availableTokens[availableTokens.length - 1];
        availableTokens.pop();

        // 将NFT转移给购买者
        _transfer(ownerOf(tokenId), msg.sender, tokenId);

        // 触发事件，通知前端
        emit MysteryBoxPurchased(msg.sender, tokenId);

        return tokenId; // 返回选中的NFT ID
    }

    // ========================= NFT相关功能 =========================

    // 铸造NFT
    function mintItem(address to, string memory uri) public returns (uint256) {
        tokenIdCounter.increment(); // 增加NFT ID
        uint256 tokenId = tokenIdCounter.current(); // 获取当前的NFT ID
        _safeMint(to, tokenId); // 安全地铸造NFT
        _setTokenURI(tokenId, uri); // 设置NFT URI
        _creators[tokenId] = msg.sender; // 保存创作者地址
        return tokenId; // 返回NFT ID
    }

    // ========================= 租赁相关功能 =========================

    // 创建租赁
    function createRental(uint256 tokenId, uint256 rentPrice, uint256 duration) public {
        address currentOwner = ownerOf(tokenId);  // 获取当前所有者地址
        require(ownerOf(tokenId) == msg.sender, "Only the token owner can rent it"); // 确保只有NFT持有者能租赁
        require(!rentals[tokenId].active, "This NFT is already rented"); // 确保NFT没有被租赁

        rentals[tokenId] = Rental({
        owner: currentOwner, // 记录当前所有者
        renter: address(0),
        rentPrice: rentPrice,
        startTime: 0,
        duration: duration,
        active: true
    });
    }

    // 租用NFT
    function rentNFT(uint256 tokenId) public payable {
        Rental storage rental = rentals[tokenId];
        require(rental.active, "This NFT is not available for rent"); // 确保NFT可租赁
        require(msg.value == rental.rentPrice, "Incorrect rent price"); // 确保支付的租金正确

        rental.renter = msg.sender; // 设置租用者地址
        rental.startTime = block.timestamp; // 记录租赁开始时间

        _transfer(ownerOf(tokenId), msg.sender, tokenId); // 临时转移NFT的所有权给租用者

        payable(ownerOf(tokenId)).transfer(msg.value); // 支付租金给NFT持有者
    }

    event RentalDebug(uint256 tokenId, uint256 startTime, uint256 duration, uint256 currentTime);

    // 结束租赁并归还NFT
    function endRental(uint256 tokenId) public {
        Rental storage rental = rentals[tokenId];
        require(rental.active, "This NFT is not currently rented"); // 确保NFT正在被租赁
        emit RentalDebug(tokenId, rental.startTime, rental.duration, block.timestamp); // 输出调试信息
        require(block.timestamp >= rental.startTime + rental.duration, "The rental period has not ended yet"); // 确保租赁期已结束
        require(rental.renter != address(0), "This NFT has not been rented"); // 确保租赁者地址有效

        _transfer(rental.renter, rental.owner, tokenId); // 归还NFT给所有者

        rental.renter = address(0); // 重置租赁信息
        rental.startTime = 0;
        rental.active = false;
    }

    // ========================= 拍卖相关功能 =========================

    // 创建拍卖
    function createAuction(uint256 tokenId, uint256 minPrice, uint256 duration) public {
        require(ownerOf(tokenId) == msg.sender, "Only the token owner can create an auction"); // 确保只有NFT持有者才能发起拍卖
        require(!auctions[tokenId].active, "This NFT is already on auction");

        auctions[tokenId] = Auction({
            tokenId: tokenId,
            minPrice: minPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            active: true
        });
    }

    // 出价
    function bid(uint256 tokenId) public payable {
        Auction storage auction = auctions[tokenId];
        require(auction.active, "This auction is not active");
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(msg.value > auction.highestBid, "Bid is lower than the current highest bid");

        // 退还之前的最高出价者
        if (auction.highestBidder != address(0)) {
            payable(auction.highestBidder).transfer(auction.highestBid);
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;
    }

    // 结束拍卖并转移NFT
    function endAuction(uint256 tokenId) public returns (address){
        Auction storage auction = auctions[tokenId];
        require(auction.active, "Auction has already ended");
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");

        auction.active = false;

        if (auction.highestBidder != address(0)) {
            _transfer(ownerOf(tokenId), auction.highestBidder, tokenId); // 将NFT转给最高出价者
            payable(ownerOf(tokenId)).transfer(auction.highestBid); // 将拍卖款项支付给卖家
        }
        return auction.highestBidder; // 返回最高出价者的地址
    }


    // ========================= ERC721扩展和覆盖 =========================

    // 覆盖 _baseURI 函数
    function _baseURI() internal pure override returns (string memory) {
        return ""; // 返回空字符串作为基础URI
    }

    // 覆盖 _beforeTokenTransfer 函数，正确调用父类实现
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize); // 调用 ERC721 和 ERC721Enumerable 的 _beforeTokenTransfer
    }

    // 覆盖 _burn 函数
    function _burn(uint256 tokenId) internal override(ERC721URIStorage, ERC721) {
        super._burn(tokenId); // 调用父类的 _burn
    }

    // 覆盖 tokenURI 函数
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage, ERC721) returns (string memory) {
        return super.tokenURI(tokenId); // 调用父类的 tokenURI
    }

    // 覆盖 supportsInterface 函数
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId); // 调用父类的 supportsInterface
    }

    // 购买NFT，并记录交易历史
    function purchase(
        uint256 tokenId,
        address from,
        address to,
        uint256 price,
        uint256 batchSize
    ) public payable {
        require(_exists(tokenId), "Token does not exist"); // 确保令牌存在
        require(from == ownerOf(tokenId), "From address is not the owner"); // 确保 from 地址是令牌的所有者
        require(msg.value == price, "Incorrect price"); // 确保支付的价格正确

        address creator = _creators[tokenId]; // 获取创作者地址
        uint256 royaltyAmount = (msg.value * royaltyPercentage) / 100; // 计算版税金额
        uint256 sellerAmount = msg.value - royaltyAmount;

        // 记录交易历史
        tokenTransactionHistory[tokenId].push(
            TransactionHistory({
                seller: from,
                buyer: msg.sender,
                price: msg.value,
                timestamp: block.timestamp
            })
        );

        // 支付给创作者版税
        payable(creator).transfer(royaltyAmount);
        // 剩余金额支付给卖家
        payable(from).transfer(sellerAmount);

        // 调用 _beforeTokenTransfer 方法
        _beforeTokenTransfer(from, to, tokenId, batchSize);

        // 转移令牌
        _transfer(from, to, tokenId); // 转移令牌
    }

    // 查询指定NFT的交易历史记录
    function getTokenTransactionHistory(uint256 tokenId) public view returns (TransactionHistory[] memory) {
        return tokenTransactionHistory[tokenId];
    }

    // ========================= 修改版税百分比 =========================

    function setRoyaltyPercentage(uint256 percentage) public onlyOwner {
        royaltyPercentage = percentage;
    }
}
