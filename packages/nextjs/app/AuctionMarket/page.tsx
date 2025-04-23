"use client";

import { useState, useEffect } from "react";
import { Pagination } from "antd";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";
import { useAccount } from "wagmi";
import { ethers } from "ethers";


interface Collectible {
  image: string;
  id: number;
  name: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  description: string;
  CID: string;
  minPrice: number;  // 最低拍卖价格
  auctionDuration: number;   // 拍卖时长
  highestBidder: string | null; // 最高出价者地址，允许为 null
}

const AuctionPage = () => {
  const [auctionNFTs, setAuctionNFTs] = useState<Collectible[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [bidAmount, setBidAmount] = useState<string>(""); // 用于存储用户输入的出价
  const itemsPerPage = 6;
  const { address: connectedAddress } = useAccount();

  // 合约调用
  const { writeAsync: bidNFT } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "bid",
    args: [0n],  // 默认参数，后面会动态传入
    value: 0n, // 默认出价金额，后面会动态传入
  });

  const { writeAsync: endAuction } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: "endAuction",
    args: [0n],  // 默认参数，后面会动态传入
  });

  useEffect(() => {
    // 从本地存储中获取正在拍卖的NFT
    const storedAuctionNFTs = JSON.parse(localStorage.getItem("auctionNFTs") || "[]");
    setAuctionNFTs(storedAuctionNFTs);
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleBidChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setBidAmount(event.target.value);
  };

  const handleBidSubmit = async (nftId: number) => {
    if (!bidAmount || isNaN(parseFloat(bidAmount)) || parseFloat(bidAmount) <= 0) {
      alert("请输入有效的出价金额");
      return;
    }

    try {
      // 直接将用户输入的 ETH 价格传递给合约，无需转换为 Wei
      const AuctionPriceInWei = ethers.parseUnits(bidAmount.toString(), "ether").toString();

      await bidNFT({
        args: [BigInt(nftId)],
        value: BigInt(AuctionPriceInWei),//传入出价
      });
      // 处理成功的出价（例如显示通知或更新界面）
      alert("出价成功！");
    } catch (error) {
      console.error("出价失败:", error);
      alert("出价失败，请稍后再试");
    }
  };


  // 结束拍卖
  const handleEndAuction = async (nftId: number) => {
    try {
      // 调用合约的结束拍卖方法
      const highestBidder = await endAuction({
        args: [BigInt(nftId)], // 传入NFT的ID
      });

      // 确保 highestBidder 的类型为 string | null
      const updatedHighestBidder: string | null = highestBidder ? highestBidder : null;

      // 更新拍卖NFT的信息，包含最高出价者
      setAuctionNFTs((prevNFTs: Collectible[]) => {
        const updatedNFTs: Collectible[] = prevNFTs.map((nft) =>
          nft.id === nftId
            ? { ...nft, highestBidder: updatedHighestBidder }
            : nft
        );
        return updatedNFTs;
      });

      // 从本地存储中删除已结束拍卖的NFT
      const updatedNFTs = auctionNFTs.filter((nft) => nft.id !== nftId);
      setAuctionNFTs(updatedNFTs);
      localStorage.setItem("auctionNFTs", JSON.stringify(updatedNFTs));

      // 显示成功通知
      notification.success("拍卖已结束");
      alert(`NFT #${nftId} 的拍卖已经结束！`);

    } catch (error) {
      console.error("结束拍卖失败:", error);
      alert("结束拍卖失败，请稍后再试");
    }
  };



  const paginatedAuctionNFTs = auctionNFTs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <>
      <div className="flex items-center flex-col pt-10">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">NFT拍卖</span>
        </h1>
      </div>

      {auctionNFTs.length === 0 ? (
        <div className="flex justify-center items-center mt-10">
          <div className="text-2xl text-primary-content">No NFTs are currently on auction</div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 my-8 px-5 justify-center">
          {paginatedAuctionNFTs.map((item) => (
            <div key={item.id} className="card card-compact bg-base-100 shadow-lg sm:min-w-[300px]">
              <figure className="relative">
                <img src={item.image} alt="NFT Image" className="h-60 w-full object-contain" />
                <figcaption className="glass absolute bottom-4 left-4 p-4 w-25 rounded-xl">
                  <span className="text-pink"># {item.id}</span>
                </figcaption>
              </figure>
              <div className="card-body space-y-3">
                <div className="flex items-center justify-center">
                  <p className="text-xl p-0 m-0 font-semibold">NFT名称：{item.name}</p>
                  <div className="flex flex-wrap space-x-2 mt-1">
                    {item.attributes.map((attr, index) => (
                      <span key={index} className="badge badge-primary py-3">
                        {attr.trait_type}: {attr.value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col justify-center mt-1">
                  <p className="my-0 text-lg">描述：{item.description}</p>
                </div>
                <div className="flex space-x-3 mt-1 items-center">
                  <span className="text-lg font-semibold">发布者 : </span>
                  <Address address={item.owner} />
                </div>
                {item.CID && (
                  <div className="flex space-x-3 mt-1 items-center">
                    <span className="text-lg font-semibold">CID : </span>
                    <span>{item.CID}</span>
                  </div>
                )}

                {/* 显示最低拍卖价格和拍卖时长 */}
                <div className="flex flex-col my-2 space-y-1">
                  <span className="text-lg font-semibold">最低价格: </span>
                  <span>{(item.minPrice)} ETH</span>
                  <span className="text-lg font-semibold">拍卖时长: </span>
                  <span>{item.auctionDuration}秒</span>
                </div>

                {/* 出价输入框和按钮 */}
                <div className="flex flex-col mt-4">
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={handleBidChange}
                    placeholder="请输入出价金额 (ETH)"
                    className="input input-bordered w-full mb-2"
                  />
                  <button
                    onClick={() => handleBidSubmit(item.id)} // 传入对应的 tokenId
                    className="btn btn-primary w-full"
                  >
                    出价
                  </button>
                </div>

                {/* 结束拍卖按钮 */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => handleEndAuction(item.id)}
                    className="btn btn-danger w-full"
                  >
                    结束拍卖
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
      <Pagination
        current={currentPage}
        pageSize={itemsPerPage}
        total={auctionNFTs.length}
        onChange={handlePageChange}
        style={{ marginTop: "2rem", textAlign: "center" }}
      />
    </>
  );
};

export default AuctionPage;
