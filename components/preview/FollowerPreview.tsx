"use client"
import React, { useEffect, useRef } from 'react'
import CountUp from 'react-countup'

type Props = {
  username?: string
  avatarUrl?: string
  posts?: number
  primary?: number
  following?: number
  postsLabel?: string
  primaryLabel?: string
  followingLabel?: string
  className?: string
}

const FollowerPreview: React.FC<Props> = ({
  username = 'example_user',
  avatarUrl = '/bg.png',
  posts = 30,
  primary = 1800,
  following = 329,
  postsLabel = 'posts',
  primaryLabel = 'followers',
  followingLabel = 'following',
  className = 'preview followers',
}) => {
  const prevRef = useRef<number>(0);
  // Keep prevRef in sync after each render so next render can use previous value
  useEffect(() => {
    prevRef.current = primary;
  }, [primary]);

  return (
    <div className={className}>
        <h2 className='username'>{username}</h2>
        <div className="user-container">
            <div className="avatar-wrapper">
                <img className='avatar' src={avatarUrl} alt="User Avatar" />
            </div>
            <div className="info">
                <h3 className='full-name'>{username.split('.')[0] || username}</h3>
                <div className="stats-container">
                    <div className="stat">
                        <span className="number">{posts}</span>
                        <span className="label">{postsLabel}</span>
                    </div>
                    <div className="stat">
                        <span className="number">
                          <CountUp start={prevRef.current} end={primary} duration={0.8} redraw />
                        </span>
                        <span className="label">{primaryLabel}</span>
                    </div>
                    <div className="stat">
                        <span className="number">{following}</span>
                        <span className="label">{followingLabel}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default FollowerPreview