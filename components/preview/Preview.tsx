import React from 'react'
import Image from 'next/image'
import './preview.css'

interface PostPreviewProps {
  title?: string
  imageSrc?: string
  likes?: number
  comments?: number
}

interface ProfilePreviewProps {
  name?: string
  avatarSrc?: string
  followers?: number
  bio?: string
}

const Preview: React.FC<{post?: PostPreviewProps; profile?: ProfilePreviewProps}> = ({
  post,
  profile,
}) => {
  const p = post ?? { title: 'Sample post title', likes: 124, comments: 8 };
  const pr = profile ?? { name: 'Demo User', followers: 4520, bio: 'Creator · Social growth' };

  return (
    <div className="w-full preview-root">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 preview-grid">
        {/* Post preview */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100 post-card">
          <div className="w-full h-44 bg-gray-100 flex items-center justify-center">
            {/* placeholder image */}
            <div className="w-5/6 h-32 bg-gradient-to-r from-pink-300 to-yellow-200 rounded-md flex items-center justify-center">
              <span className="text-sm text-gray-700">Post image preview</span>
            </div>
          </div>
          <div className="p-4">
            <h4 className="text-lg font-medium text-gray-900">{p.title}</h4>
            <p className="text-sm text-gray-500 mt-2">This is how your service post will look when posted to the platform.</p>
            <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-pink-500" fill="currentColor" viewBox="0 0 20 20"><path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 18.657l-6.828-6.829a4 4 0 010-5.656z"/></svg>
                <span>{p.likes}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.82L3 20l1.4-4.2A7.966 7.966 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>{p.comments}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile preview */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-100 p-4 flex flex-col profile-card">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {/* avatar placeholder */}
              <span className="text-sm text-gray-600">A</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{pr.name}</h4>
                  <div className="text-sm text-gray-500">{pr.bio}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Followers</div>
                  <div className="font-semibold text-gray-900">{pr.followers?.toLocaleString?.() ?? '0'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm text-gray-600">Preview of how the profile will appear alongside the service post.</div>
            <div className="mt-3 flex gap-2">
              <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded">Follow</button>
              <button className="px-3 py-1 border border-gray-200 text-sm rounded">Message</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Preview