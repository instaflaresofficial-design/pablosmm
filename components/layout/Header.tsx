"use client";

import Image from 'next/image'
import React from 'react'
import { Menu, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/components/providers/auth-provider'
import { Loader2 } from 'lucide-react'

const Header = () => {
  const { user, loading } = useAuth();

  return (
    <div className='navigation'>
      <div className='hamburger'>
        <Menu color="white" size={26} />
      </div>
      <div className="logo">
        <Link href="/">
          <Image src="/logos/logo.svg" alt="Logo" width={100} height={40} />
        </Link>
      </div>

      <Link href="/profile" className='profile'>
        {loading ? (
          <Loader2 size={16} className="animate-spin text-white" />
        ) : (
          <Image
            src={user?.avatar_url || "/logos/profile.png"}
            alt="User Profile"
            width={30}
            height={30}
            className={user?.avatar_url ? "rounded-full" : ""}
          />
        )}
      </Link>
    </div>
  )
}

export default Header