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
  isLoading?: boolean
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
  isLoading = false,
}) => {
  const prevPrimary = useRef<number>(0);
  const prevPosts = useRef<number>(0);
  const prevFollowing = useRef<number>(0);

  useEffect(() => {
    prevPrimary.current = primary;
    prevPosts.current = posts;
    prevFollowing.current = following;
  }, [primary, posts, following]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="skeleton-pulse" style={{ width: 150, height: 24, margin: '0 auto 20px', borderRadius: 4, background: '#1a1a1a' }} />
        <div className="user-container">
          <div className="avatar-wrapper">
            <div className="skeleton-pulse" style={{ width: 80, height: 80, borderRadius: '50%', background: '#1a1a1a' }} />
          </div>
          <div className="info">
            <div className="skeleton-pulse" style={{ width: 120, height: 20, marginBottom: 8, borderRadius: 4, background: '#1a1a1a' }} />
            <div className="stats-container">
              {[1, 2, 3].map((i) => (
                <div key={i} className="stat">
                  <div className="skeleton-pulse" style={{ width: 40, height: 20, marginBottom: 4, borderRadius: 4, background: '#1a1a1a' }} />
                  <div className="skeleton-pulse" style={{ width: 60, height: 12, borderRadius: 4, background: '#1a1a1a' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <span className="number">
                <CountUp start={prevPosts.current} end={posts} duration={0.8} separator="," redraw />
              </span>
              <span className="label">{postsLabel}</span>
            </div>
            <div className="stat">
              <span className="number">
                <CountUp start={prevPrimary.current} end={primary} duration={0.8} separator="," redraw />
              </span>
              <span className="label">{primaryLabel}</span>
            </div>
            <div className="stat">
              <span className="number">
                <CountUp start={prevFollowing.current} end={following} duration={0.8} separator="," redraw />
              </span>
              <span className="label">{followingLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FollowerPreview