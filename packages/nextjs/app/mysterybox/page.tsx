"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useScaffoldContractRead, useScaffoldContractWrite, useScaffoldEventSubscriber } from "~~/hooks/scaffold-eth";
import * as THREE from "three";

const Mysterybox = () => {
  const { address: connectedAddress, isConnected, isConnecting } = useAccount();
  const [mysteryBoxTokens, setMysteryBoxTokens] = useState<number[]>([]);
  const [createdNFTs, setCreatedNFTs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false); // 加载状态
  const [lastPurchasedTokenId, setLastPurchasedTokenId] = useState<number | null>(null); // 新增状态来保存抽到的NFT tokenId
  const [showModal, setShowModal] = useState(false); // 控制弹窗显示

  const sceneRef = useRef<any>(null);
  const [renderer, setRenderer] = useState<any>(null);
  const [camera, setCamera] = useState<any>(null);

  // 获取盲盒中所有NFT的tokenId
  const { data: availableTokens } = useScaffoldContractRead({
    contractName: "YourCollectible",
    functionName: "getMysteryBoxTokens",
    watch: true,
    cacheOnBlock: true,
  });

  // 调用购买盲盒的合约方法
  const { writeAsync: buyMysteryBox } = useScaffoldContractWrite({
    contractName: "YourCollectible",
    functionName: 'buyMysteryBox',
    args: undefined,

  });

  // 监听MysteryBoxPurchased事件
  useScaffoldEventSubscriber({
    contractName: "YourCollectible",
    eventName: "MysteryBoxPurchased",
    listener: (logs) => {
      // 获取事件参数中的 tokenId
      const tokenId = Number(logs[0]?.args?.tokenId); // 从事件参数中获取 tokenId
      if (tokenId) {
        setLastPurchasedTokenId(tokenId); // 更新状态，保存刚刚抽到的tokenId
        setShowModal(true); // 显示弹窗
      }
    },
  });

  // 获取已创建的NFT信息
  useEffect(() => {
    const storedNFTs = localStorage.getItem("createdNFTs");
    if (storedNFTs) {
      setCreatedNFTs(JSON.parse(storedNFTs));
    }
  }, []);

  useEffect(() => {
    if (availableTokens) {
      const tokenIds = availableTokens.map((token) => Number(token));
      setMysteryBoxTokens(tokenIds);
    }
  }, [availableTokens]);

  useEffect(() => {
    // 初始化3D场景
    if (sceneRef.current) {
      // 1. 创建场景
      const scene = new THREE.Scene();
      scene.background = null; // 设置透明背景

      // 2. 设置相机
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.set(4, 4, 4); // 让相机稍微偏向上方，确保能够看到立方体的各个面
      camera.lookAt(0, 0, 0); // 确保相机始终面朝立方体的中心

      // 3. 设置渲染器，透明背景
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth * 0.5, window.innerHeight * 0.5); // 设置渲染器的大小
      sceneRef.current.appendChild(renderer.domElement);
      setRenderer(renderer);
      setCamera(camera);

      // 4. 创建立方体几何体，并为每一面设置纹理
      const geometry = new THREE.BoxGeometry(3.5, 3.5, 3.5); // 设置立方体的大小
      const materialArray = mysteryBoxTokens.map((tokenId) => {
        const nft = createdNFTs.find((nft) => nft.tokenId === tokenId);
        if (nft) {
          // 加载纹理
          const texture = new THREE.TextureLoader().load(nft.image);

          // 优化纹理设置，防止模糊
          texture.minFilter = THREE.LinearFilter; // 防止纹理缩小时变模糊
          texture.magFilter = THREE.LinearFilter; // 防止纹理放大时变模糊
          texture.anisotropy = 16; // 启用各向异性过滤，增强纹理清晰度

          return new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide, // 启用双面渲染
          });
        } else {
          return new THREE.MeshBasicMaterial({
            color: 0xdddddd,
            side: THREE.DoubleSide, // 启用双面渲染
          });
        }
      });
      const cube = new THREE.Mesh(geometry, materialArray);
      scene.add(cube);

      // 5. 动画循环，让立方体旋转
      const animate = () => {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01; // X轴旋转（加速）
        cube.rotation.y += 0.01; // Y轴旋转（加速）
        renderer.render(scene, camera); // 渲染场景
      };
      animate();

      // 清理函数
      return () => {
        if (sceneRef.current && renderer) {
          sceneRef.current.removeChild(renderer.domElement); // 卸载渲染器
        }
      };
    }
  }, [mysteryBoxTokens, createdNFTs]);

  useEffect(() => {
    // 如果有购买的NFT，更新owner信息
    if (lastPurchasedTokenId !== null) {
      // 找到对应的NFT
      const updatedNFTs = [...createdNFTs];
      const nftIndex = updatedNFTs.findIndex((nft) => nft.tokenId === lastPurchasedTokenId);

      if (nftIndex !== -1) {
        // 更新owner
        updatedNFTs[nftIndex].owner = connectedAddress;

        // 更新state中的createdNFTs
        setCreatedNFTs(updatedNFTs);

        // 更新localStorage
        localStorage.setItem("createdNFTs", JSON.stringify(updatedNFTs));
      }

      // 从mysteryBoxTokens中移除购买的NFT
      const updatedTokens = mysteryBoxTokens.filter((tokenId) => tokenId !== lastPurchasedTokenId);

      // 更新state中的mysteryBoxTokens
      setMysteryBoxTokens(updatedTokens);

      // 更新localStorage中的mysteryBoxTokens
      localStorage.setItem("mysteryBoxTokens", JSON.stringify(updatedTokens));

    }
  }, [lastPurchasedTokenId, createdNFTs, connectedAddress, mysteryBoxTokens]); // 当lastPurchasedTokenId变化时触发


  // 通过useContractWrite的onSuccess和onError回调来处理交易状态
  // 购买盲盒的逻辑
  const handleBuyMysteryBox = async () => {
    if (!isConnected) {
      alert("请连接钱包");
      return;
    }

    const priceInETH = 0.1; // 假设盲盒价格是 0.1 ETH
    const priceInWei = BigInt(priceInETH * 1e18); // 使用 BigInt 转换 ETH 到 Wei

    try {
      setIsLoading(true); // 开始加载

      // 调用 buyMysteryBox 函数并传递交易金额
      const tx = await buyMysteryBox({
        value: priceInWei, // 需要以字符串传递给合约
      });

      console.log("Transaction hash:", tx);
      
      // 购买成功后触发更新NFT的操作
      const tokenId = lastPurchasedTokenId; // 获取最新购买的 tokenId
      if (tokenId) {
        setLastPurchasedTokenId(tokenId); // 更新状态，确保更新owner信息
      }

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false); // 结束加载
    }
  };


  // 关闭弹窗
  const handleCloseModal = () => {
    setShowModal(false); // 隐藏弹窗
    setLastPurchasedTokenId(null); // 清空已抽中的NFT tokenId
  };


  // 获取当前抽到的NFT的详情
  const currentNFT = createdNFTs.find((nft) => nft.tokenId === lastPurchasedTokenId);


  return (
    <>
      <div className="flex items-center justify-center flex-col pt-10">
        <h1 className="text-center mb-8 text-4xl font-bold">盲盒中的NFT</h1>
      </div>

      <div className="flex justify-center items-center flex-col mb-8">
        <button
          onClick={handleBuyMysteryBox}
          disabled={isLoading} // 如果正在加载，禁用按钮
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:opacity-50"
        >
          {isLoading ? "正在购买..." : "购买盲盒"}
        </button>
      </div>

      <div className="flex justify-center items-center flex-col">
        <div className="mb-8">

          {/* 检查是否有 NFT 可显示 */}
          {mysteryBoxTokens.length === 0 || createdNFTs.length === 0 ? (
            // 如果没有 NFT 显示盲盒为空提示
            <div className="text-2xl text-primary-content">No mysterybox NFTs found</div>
          ) : (
          // 否则渲染 NFT 卡片

          <div className="grid grid-cols-3 gap-4">
            {mysteryBoxTokens.map((tokenId) => {
              const nft = createdNFTs.find((nft) => nft.tokenId === tokenId);
              if (!nft) {
                return (
                  <div key={tokenId} className="card">
                    <p>Token ID: {tokenId} - NFT未找到</p>
                  </div>
                );
              }

              return (
                <div
                  key={tokenId}
                  className="relative card"
                  style={{ position: "relative", width: "100%", height: "auto" }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLDivElement;
                    const info = target.querySelector(".nft-info") as HTMLElement;
                    if (info) info.style.display = "flex";
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLDivElement;
                    const info = target.querySelector(".nft-info") as HTMLElement;
                    if (info) info.style.display = "none";
                  }}
                >
                  <img src={nft.image} alt={nft.name} className="w-full h-60 object-contain" />
                  <div
                    className="nft-info absolute inset-0 bg-black bg-opacity-30 text-white flex justify-center items-center p-4"
                    style={{ display: "none" }}
                  >
                    <div className="text-center">
                      <h3 className="text-xl">{nft.name}</h3>
                      <p>{nft.description}</p>
                      <p>Token ID: {nft.tokenId}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* 3D 渲染的盲盒场景 */}
        <div
          ref={sceneRef}
          style={{
            width: "100%",
            height: "500px",
            maxWidth: "800px",
            maxHeight: "600px",
            marginTop: "-10px",
          }}
        />
      </div>

      {/* 弹窗显示 */}
      {showModal && currentNFT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full">
            <h2 className="text-2xl font-bold mb-4">恭喜你！抽到了NFT</h2>
            <img
              src={currentNFT.image}
              alt={currentNFT.name}
              className="w-full h-60 object-contain mb-4"
            />
            <p className="mb-4">Token ID: {currentNFT.tokenId}</p>
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 bg-red-500 text-white rounded-md"
            >
              关闭
            </button>
          </div>
        </div>
      )}


    </>
  );
};

export default Mysterybox;
