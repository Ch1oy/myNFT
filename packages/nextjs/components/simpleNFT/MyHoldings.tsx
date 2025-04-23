import { useEffect, useState } from "react";
import { NFTCard } from "./NFTCard";
import { useAccount } from "wagmi";
import { useScaffoldContract, useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { message, Switch, Pagination, Modal, InputNumber, Button } from "antd";

export interface Collectible {
  image: string;
  id: number;
  name: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  price: string;
  description: string;
  uri?: string;
  tokenId?: number;
  CID?: string;
}

export const MyHoldings = () => {
  const { address: connectedAddress } = useAccount();
  const [myAllCollectibles, setMyAllCollectibles] = useState<Collectible[]>([]);
  const [allCollectiblesLoading, setAllCollectiblesLoading] = useState(false);
  const [isListed, setIsListed] = useState<{ [key: number]: boolean }>({});
  const [isRented, setIsRented] = useState<{ [key: number]: boolean }>({});  // 新增状态，用于记录租赁状态
  const [price, setPrice] = useState<{ [key: number]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [modalVisible, setModalVisible] = useState(false); // 控制租赁Modal的显示
  const [rentPrice, setRentPrice] = useState<number>(0); // 租金
  const [duration, setDuration] = useState<number>(1); // 租赁时长（默认1秒）
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null); // 当前选择的NFT的tokenId
  const [isAuctioning, setIsAuctioning] = useState<{ [key: number]: boolean }>({}); // 新增状态，记录拍卖状态
  const [auctionModalVisible, setAuctionModalVisible] = useState(false); // 控制拍卖Modal显示
  const [minPrice, setMinPrice] = useState<number>(0); // 拍卖的最低价格
  const [auctionDuration, setAuctionDuration] = useState<number>(60); // 拍卖时长，默认60秒
  const [selectedAuctionTokenId, setSelectedAuctionTokenId] = useState<number | null>(null); // 选择的NFT的tokenId

  const itemsPerPage = 3;

  const { data: yourCollectibleContract } = useScaffoldContract({
    contractName: "YourCollectible",
  });

  const { data: myTotalBalance } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "balanceOf",
    args: [connectedAddress],
    watch: true,
  });

  const { writeAsync: createRental } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "createRental",
    args: [0n, BigInt(rentPrice), BigInt(duration)],
  });

  const { writeAsync: createAuction } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "createAuction",
    args: [0n, BigInt(minPrice * 10 ** 18), BigInt(auctionDuration)], // 参数是tokenId, 起始价格和时长
  });


  const broadcastChannel = new BroadcastChannel('nft_channel');

  useEffect(() => {

    // 获取本地存储中的租赁状态
    const storedRentedNFTs = JSON.parse(localStorage.getItem("rentedNFTs") || "[]");
    const rentedState: { [key: number]: boolean } = {};
    storedRentedNFTs.forEach((nft: { tokenId: number }) => {
      rentedState[nft.tokenId] = true;
    });
    setIsRented(rentedState);
    const updateMyCollectibles = async (): Promise<void> => {
      if (myTotalBalance === undefined || yourCollectibleContract === undefined || connectedAddress === undefined) return;

      setAllCollectiblesLoading(true);
      const collectibleUpdate: Collectible[] = [];

      const storedNFTs = localStorage.getItem("createdNFTs");
      let userNFTs: Collectible[] = [];
      if (storedNFTs) {
        const nfts = JSON.parse(storedNFTs);
        userNFTs = nfts.filter((nft: Collectible) => nft.owner === connectedAddress);
      }

      const totalBalance = parseInt(myTotalBalance.toString());

      for (let tokenIndex = 0; tokenIndex < totalBalance; tokenIndex++) {
        try {
          const tokenId = await yourCollectibleContract.read.tokenOfOwnerByIndex([connectedAddress, BigInt(tokenIndex)]);

          const tokenURI = await yourCollectibleContract.read.tokenURI([tokenId]);

          const localNFT = userNFTs.find((nft: Collectible) => nft.id === parseInt(tokenId.toString()));

          if (localNFT) {
            collectibleUpdate.push({
              ...localNFT,
              uri: tokenURI,
              tokenId: parseInt(tokenId.toString()),
            });
          }
        } catch (e) {
          setAllCollectiblesLoading(false);
          console.log(e);
        }
      }

      collectibleUpdate.push(...userNFTs.filter(nft => !collectibleUpdate.find(item => item.id === nft.id)));

      collectibleUpdate.sort((a, b) => a.id - b.id);
      setMyAllCollectibles(collectibleUpdate);
      setAllCollectiblesLoading(false);
    };

    updateMyCollectibles();

    // 获取本地存储中的拍卖状态
    const storedAuctionNFTs = JSON.parse(localStorage.getItem("auctionNFTs") || "[]");
    const auctionState: { [key: number]: boolean } = {};
    storedAuctionNFTs.forEach((nft: { tokenId: number }) => {
      auctionState[nft.tokenId] = true;
    });
    setIsAuctioning(auctionState);

    broadcastChannel.onmessage = (event) => {
      const newNFT = event.data;
      const storedNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
      const updatedNFTs = [...storedNFTs, newNFT];
      localStorage.setItem("createdNFTs", JSON.stringify(updatedNFTs));
      setMyAllCollectibles(prevCollectibles => [...prevCollectibles, newNFT]);
    };

    const interval = setInterval(updateMyCollectibles, 20000); // 每20秒轮询一次

    const storedListedNFTs = JSON.parse(localStorage.getItem("listedNFTs") || "[]");
    const listedState: { [key: number]: boolean } = {};
    const priceState: { [key: number]: string } = {};
    storedListedNFTs.forEach((nft: { id: number, price: string }) => {
      listedState[nft.id] = true;
      priceState[nft.id] = nft.price;
    });
    setIsListed(listedState);
    setPrice(priceState);

    return () => {
      clearInterval(interval); // 在组件卸载时清除轮询
      broadcastChannel.close(); // 关闭广播通道
    };
  }, [connectedAddress, myTotalBalance]);

  const handleRentClick = (tokenId: number) => {
    setSelectedTokenId(tokenId);
    setModalVisible(true); // 显示租赁表单
  };

  const handleRentSubmit = async () => {
    if (selectedTokenId !== null && rentPrice > 0 && duration > 0) {

      const rentPriceInWei = BigInt(rentPrice * 10 ** 18); // 直接将租金乘以 10^18 来转换为 wei // "ether"是指ETH单位
      // 调用合约创建租赁
      await createRental({ args: [BigInt(selectedTokenId), rentPriceInWei, BigInt(duration)] });

      // 租赁成功后，保存到本地存储
      const storedNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
      const rentedNFT = storedNFTs.find((nft: Collectible) => nft.tokenId === selectedTokenId);

      if (rentedNFT) {
        // 创建一个租赁数据数组，保存租赁信息
        const rentedNFTs = JSON.parse(localStorage.getItem("rentedNFTs") || "[]");
        rentedNFTs.push({ ...rentedNFT, rentPrice, duration });
        localStorage.setItem("rentedNFTs", JSON.stringify(rentedNFTs));

        // 更新租赁状态
        setIsRented(prev => ({ ...prev, [selectedTokenId]: true }));

        // 可选：显示成功消息
        message.success("租赁创建成功！");
      }
    } else {
      message.error("请正确填写租金和租赁时长");
    }
  };

  const handleAuctionClick = (tokenId: number) => {
    setSelectedAuctionTokenId(tokenId);
    setAuctionModalVisible(true); // 显示拍卖表单
  };
  const handleAuctionSubmit = async () => {
    if (selectedAuctionTokenId !== null && minPrice > 0 && auctionDuration > 0) {
      const minPriceInWei = BigInt(minPrice * 10 ** 18); // 将ETH转为wei

      // 调用合约创建拍卖
      await createAuction({ args: [BigInt(selectedAuctionTokenId), minPriceInWei, BigInt(auctionDuration)] });

      // 获取当前拍卖的NFT信息
      const storedNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
      const auctionNFT = storedNFTs.find((nft: Collectible) => nft.tokenId === selectedAuctionTokenId);

      if (auctionNFT) {
        // 将拍卖信息存入localStorage
        const auctionNFTs = JSON.parse(localStorage.getItem("auctionNFTs") || "[]");
        auctionNFTs.push({ ...auctionNFT, minPrice, auctionDuration });
        localStorage.setItem("auctionNFTs", JSON.stringify(auctionNFTs));

        // 更新拍卖状态
        setIsAuctioning(prev => ({ ...prev, [selectedAuctionTokenId]: true }));

        // 可选：在当前页面立即更新
        setAuctionModalVisible(false); // 关闭拍卖Modal
      }

      // 显示成功消息
      message.success("拍卖创建成功！");
    } else {
      message.error("请正确填写拍卖信息");
    }
  };


  const handleTransferSuccess = (id: number) => {
    setMyAllCollectibles(prevCollectibles => prevCollectibles.filter(item => item.id !== id));
  };

  // 上架或下架 NFT
  const handleListToggle = async (checked: boolean, id: number) => {
    const storedNFTs = JSON.parse(localStorage.getItem("createdNFTs") || "[]");
    let allNFTs = JSON.parse(localStorage.getItem("allNFTs") || "[]");

    if (checked) {
      // 确保用户设置了价格
      if (!price[id]) {
        message.error("请设置价格");
        return;
      }

      // 向后端发送请求更新NFT的价格和状态
      const response = await fetch("http://localhost:3001/updateNFTListing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id, // NFT的ID
          price: price[id], // 设置的价格
          status: "已上架", // 状态设置为"已上架"
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 后端更新成功，保存本地状态
        const listedNFTs = JSON.parse(localStorage.getItem("listedNFTs") || "[]");
        listedNFTs.push({ id, price: price[id] });
        localStorage.setItem("listedNFTs", JSON.stringify(listedNFTs));

        const nft = storedNFTs.find((nft: Collectible) => nft.id === id);
        if (nft) {
          allNFTs.push({ ...nft, isListed: true });
          localStorage.setItem("allNFTs", JSON.stringify(allNFTs));
        }

        message.success("上架成功");
      } else {
        message.error("上架失败，请稍后再试");
      }
    } else {
      // 下架操作
      const listedNFTs = JSON.parse(localStorage.getItem("listedNFTs") || "[]");
      const updatedNFTs = listedNFTs.filter((item: { id: number }) => item.id !== id);
      localStorage.setItem("listedNFTs", JSON.stringify(updatedNFTs));

      allNFTs = allNFTs.filter((nft: Collectible) => nft.id !== id);
      localStorage.setItem("allNFTs", JSON.stringify(allNFTs));

      // 向后端发送请求更新NFT状态为"下架"
      const response = await fetch("http://localhost:3001/updateNFTListing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id, // NFT的ID
          price: null, // 下架时价格为null
          status: "未上架", // 状态设置为"未上架"
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success("下架成功");
      } else {
        message.error("下架失败，请稍后再试");
      }
    }

    setIsListed(prev => ({ ...prev, [id]: checked }));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const paginatedNFTs = myAllCollectibles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      {myAllCollectibles.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-primary-content">No NFTs found</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 my-8 px-5 justify-center">
          {paginatedNFTs.map((item) => (
            <div key={item.id}>
              <NFTCard nft={item} onTransferSuccess={handleTransferSuccess} />
              <div className="card-actions justify-center">
                <div className="flex flex-row items-center">
                  {/* 租赁按钮 */}
                  <Button
                    onClick={() => {
                      if (item.tokenId != null && !isRented[item.tokenId]) {
                        handleRentClick(item.tokenId);
                      }
                    }}
                    type="primary"
                    className="mr-3"
                    style={{ backgroundColor: '#ff66b2', borderColor: '#ff66b2', color: '#fff', fontWeight: 'bold' }}
                  >
                    {item.tokenId != null && isRented[item.tokenId] ? "租赁中" : "租赁"}
                  </Button>

                  {/* 创建拍卖按钮 */}
                  <Button
                    onClick={() => handleAuctionClick(item.tokenId!)}
                    type="primary"
                    className="mr-3"
                    style={{ backgroundColor: '#ff66b2', borderColor: '#ff66b2', color: '#fff', fontWeight: 'bold' }}
                  >
                    {item.tokenId != null && isAuctioning[item.tokenId] ? "拍卖中" : "创建拍卖"}
                  </Button>

                  <span className="mr-3">上架</span>
                  <Switch checked={isListed[item.id] || false} onChange={(checked: any) => handleListToggle(checked, item.id)} />
                  <input
                    type="text"
                    value={price[item.id] || ""}
                    onChange={(e) => setPrice(prev => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="Price in ETH"
                    disabled={isListed[item.id]}
                    className="border ml-3 p-2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination
        current={currentPage}
        pageSize={itemsPerPage}
        total={myAllCollectibles.length}
        onChange={handlePageChange}
        style={{ marginTop: "2rem", textAlign: "center" }}
      />
      {/* 租赁Modal */}
      <Modal
        title="创建租赁"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleRentSubmit}
        style={{
          backgroundColor: '#fff0f6',  // 弹窗背景为粉色
          borderRadius: '16px',  // 圆角样式
        }}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)} style={{ backgroundColor: '#f56bb0', color: '#fff', borderRadius: '8px' }}>
            取消
          </Button>,
          <Button key="submit" onClick={handleRentSubmit} type="primary" style={{ backgroundColor: '#ff66b2', borderColor: '#ff66b2', borderRadius: '8px' }}>
            提交
          </Button>
        ]}
      >
        <div>
          <div className="mb-4">
            <span className="mr-2">租金：</span>
            <InputNumber
              value={rentPrice}
              onChange={(value: number | string) => setRentPrice(typeof value === 'number' ? value : 0)}
              min={0}
              style={{
                width: '100%',
                borderColor: '#ff66b2',  // 输入框边框粉色
                borderRadius: '8px'  // 圆角
              }}
              placeholder="输入租金 (ETH)"
            />
          </div>
          <div className="mb-4">
            <span className="mr-2">租赁时长 (秒)：</span>
            <InputNumber
              value={duration}
              onChange={(value: number | string) => setDuration(typeof value === 'number' ? value : 1)}
              min={1}
              style={{
                width: '100%',
                borderColor: '#ff66b2',  // 输入框边框粉色
                borderRadius: '8px'  // 圆角
              }}
              placeholder="输入租赁时长 (秒)"
            />
          </div>
        </div>
      </Modal>

      {/* 拍卖Modal */}
      <Modal
        title="创建拍卖"
        visible={auctionModalVisible}
        onCancel={() => setAuctionModalVisible(false)}
        onOk={handleAuctionSubmit}
        footer={[
          <Button key="cancel" onClick={() => setAuctionModalVisible(false)} style={{ backgroundColor: '#f56bb0', color: '#fff' }}>
            取消
          </Button>,
          <Button key="submit" onClick={handleAuctionSubmit} type="primary" style={{ backgroundColor: '#ff66b2', borderColor: '#ff66b2' }}>
            提交
          </Button>,
        ]}
      >
        <div>
          <div className="mb-4">
            <span className="mr-2">起始价格：</span>
            <InputNumber
              value={minPrice}
              onChange={(value: number | string) => setMinPrice(typeof value === 'number' ? value : 0)}
              min={0}
              style={{ width: '100%', borderColor: '#ff66b2', borderRadius: '8px'}}
              placeholder="输入起始价格 (ETH)"
            />
          </div>
          <div className="mb-4">
            <span className="mr-2">拍卖时长 (秒)：</span>
            <InputNumber
              value={auctionDuration}
              onChange={(value: number | string) => setAuctionDuration(typeof value === 'number' ? value : 60)}
              min={1}
              style={{ width: '100%', borderColor: '#ff66b2', borderRadius: '8px' }}
              placeholder="输入拍卖时长 (秒)"
            />
          </div>
        </div>
      </Modal>

    </>
  );
};
