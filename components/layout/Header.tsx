import Image from 'next/image'
import React from 'react'
import { Menu } from 'lucide-react'
import Link from 'next/link'

const Header = () => {
  return (
    <div className='navigation'>
      <div className='hamburger'>
        <Menu color="white" size={26} />
      </div>
      <div className="logo">
        <Image src="/logos/logo.svg" alt="Logo" width={100} height={40} />
      </div>
      <Link href="/profile" className='profile'>
        <Image src="/logos/profile.png" alt="User Profile" width={30} height={30} />
      </Link>
    </div>
  )
}

export default Header