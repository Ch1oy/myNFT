"use client";

import React, { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  Bars3Icon,
  BugAntIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  subMenu?: HeaderMenuLink[]; // 二级菜单项
};


export const menuLinks: HeaderMenuLink[] = [
  {
    label: "我的NFT",
    href: "/myNFTs",
    icon: <PhotoIcon className="h-4 w-4" />,
    subMenu: [
      {
        label: "我的收藏",
        href: "/myCollection",
      },
    ]
  },
  {
    label: "NFT记录",
    href: "/transfers",
    icon: <ArrowPathIcon className="h-4 w-4" />,
  },
  {
    label: "NFT文件上传",
    href: "/ipfsUpload",
    icon: <ArrowUpTrayIcon className="h-4 w-4" />,
  },
  {
    label: "NFT文件下载",
    href: "/ipfsDownload",
    icon: <ArrowDownTrayIcon className="h-4 w-4" />,
  },
  {
    label: "测试合约",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
  },
  {
    label: "NFT市场",
    href: "/allNFTs",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "NFT拍卖",
    href: "/AuctionMarket",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "NFT租赁",
    href: "/rentNFTs",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
  {
    label: "NFT盲盒",
    href: "/mysterybox",
    icon: <PhotoIcon className="h-4 w-4" />,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon, subMenu }) => {
        const isActive = pathname === href;
        return (
          <li key={href} className="relative group">
            <Link
              href={href}
              passHref
              className={`${isActive ? "bg-pink-400 text-white shadow-lg" : ""
                } hover:bg-pink-400 hover:text-white focus:!bg-pink-400 focus:text-white active:!text-neutral py-1.5 px-3 text-sm rounded-full gap-2 grid grid-flow-col transition-colors duration-300`}
            >
              {icon}
              <span>{label}</span>
            </Link>

            {/* 如果有子菜单，显示子菜单 */}
            {subMenu && (
              <ul className="absolute left-[-10px] hidden group-hover:block mt-2 bg-pink-100 text-black rounded-lg shadow-lg p-2 w-24 transition-all duration-300 ease-in-out transform opacity-0 group-hover:opacity-100 group-hover:translate-y-6 z-10">
                {subMenu.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="block py-1 px-3 text-sm hover:bg-pink-200 rounded transition-colors duration-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </>
  );
};




/**
 * Site header
 */
export const Header = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const burgerMenuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(
    burgerMenuRef,
    useCallback(() => setIsDrawerOpen(false), []),
  );

  return (
    <div className="sticky xl:static top-0 navbar bg-primary min-h-0 flex-shrink-0 justify-between z-20 shadow-md shadow-secondary px-0 sm:px-2">
      <div className="navbar-start w-auto xl:w-1/2">
        <div className="xl:hidden dropdown" ref={burgerMenuRef}>
          <label
            tabIndex={0}
            className={`ml-1 btn btn-ghost ${isDrawerOpen ? "hover:bg-secondary" : "hover:bg-transparent"}`}
            onClick={() => {
              setIsDrawerOpen(prevIsOpenState => !prevIsOpenState);
            }}
          >
            <Bars3Icon className="h-1/2" />
          </label>
          {isDrawerOpen && (
            <ul
              tabIndex={0}
              className="menu menu-compact dropdown-content mt-3 p-2 shadow bg-base-100 rounded-box w-52"
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              <HeaderMenuLinks />
            </ul>
          )}
        </div>
        <Link href="/" passHref className="hidden xl:flex items-center gap-1 ml-4 mr-6 shrink-0">
          <div className="flex relative w-10 h-10">
            <Image alt="SE2 logo" className="cursor-pointer" fill src="/logo.svg" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold leading-tight">智慧·版权</span>
            <span className="text-xs">您的版权交给区块链来保护！</span>
          </div>
        </Link>
        <ul className="hidden xl:flex xl:flex-nowrap menu menu-horizontal px-1 gap-2">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end flex-grow mr-4">
        <RainbowKitCustomConnectButton />
        <FaucetButton />
      </div>
    </div>
  );
};
