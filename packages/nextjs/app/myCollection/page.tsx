"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi"; // 引入wagmi的useAccount hook来获取当前账户
import { Button, notification, Pagination } from "antd";
import { Address } from "~~/components/scaffold-eth";

interface Collectible {
  image: string;
  id: number;
  name: string;
  attributes: { trait_type: string; value: string }[];
  owner: string;
  description: string;
  CID: string;
}

const MyCollection = () => {
  const { address } = useAccount(); // 获取当前账户地址
  const [collectedNFTs, setCollectedNFTs] = useState<Collectible[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  useEffect(() => {
    if (address) {
      // 使用账户地址作为键来获取当前账户的收藏数据
      const storedCollectedNFTs = localStorage.getItem(`collectedNFTs_${address}`);
      if (storedCollectedNFTs) {
        setCollectedNFTs(JSON.parse(storedCollectedNFTs));
      } else {
        setCollectedNFTs([]);
      }
    }
  }, [address]); // 依赖项是address，当账户切换时会重新加载数据

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleCollect = (nft: Collectible) => {
    if (address) {
      // 获取当前账户的收藏列表
      const existingCollectedNFTs = JSON.parse(localStorage.getItem(`collectedNFTs_${address}`) || "[]");
      const nftIndex = existingCollectedNFTs.findIndex((item: Collectible) => item.id === nft.id);

      if (nftIndex === -1) {
        // NFT 不在收藏列表中，加入收藏
        existingCollectedNFTs.push(nft);
        localStorage.setItem(`collectedNFTs_${address}`, JSON.stringify(existingCollectedNFTs));
        setCollectedNFTs(existingCollectedNFTs);
        notification.success({ message: "NFT已加入收藏" });
      } else {
        // NFT 已在收藏列表中，执行取消收藏
        existingCollectedNFTs.splice(nftIndex, 1);
        localStorage.setItem(`collectedNFTs_${address}`, JSON.stringify(existingCollectedNFTs));
        setCollectedNFTs(existingCollectedNFTs);
        notification.success({ message: "NFT已取消收藏" });
      }
    }
  };

  const paginatedNFTs = collectedNFTs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container mx-auto px-4">
      <div className="flex items-center flex-col pt-10">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">我的NFT收藏</span>
        </h1>
      </div>
      <div className="flex flex-wrap justify-center">
        {paginatedNFTs.length === 0 ? (
          <div className="text-2xl text-primary-content">您还没有收藏NFT</div>
        ) : (
          paginatedNFTs.map((nft) => (
            <div
              key={nft.id}
              className="card card-compact bg-base-100 shadow-lg sm:min-w-[300px] shadow-secondary"
              style={{ margin: "1rem" }}
            >
              <figure className="relative">
                <img
                  src={nft.image}
                  alt="NFT Image"
                  className="h-60 w-full object-contain"
                />
              </figure>
              <div className="card-body space-y-3">
                <div className="flex items-center justify-center">
                  <p className="text-xl p-0 m-0 font-semibold">NFT名称：{nft.name}</p>
                </div>
                <div className="flex flex-col justify-center mt-1">
                  <p className="my-0 text-lg">描述：{nft.description}</p>
                </div>
                <div className="flex space-x-3 mt-1 items-center">
                  <span className="text-lg font-semibold">发布者 : </span>
                  <Address address={nft.owner} />
                </div>
                <div className="card-actions justify-end">
                  <Button
                    type="primary"
                    className="btn btn-secondary btn-md px-8 tracking-wide"
                    onClick={() => handleCollect(nft)}
                  >
                    {collectedNFTs.some((item) => item.id === nft.id) ? "取消收藏" : "加入收藏"}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <Pagination
        current={currentPage}
        pageSize={itemsPerPage}
        total={collectedNFTs.length}
        onChange={handlePageChange}
        style={{ marginTop: "2rem", textAlign: "center" }}
      />
    </div>
  );
};

export default MyCollection;
