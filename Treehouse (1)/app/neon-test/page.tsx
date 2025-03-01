"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function NeonTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<any>(null)
  const [dispensaries, setDispensaries] = useState<any[]>([])
  const [loading, setLoading] = useState({
    connection: false,
    seed: false,
    dispensaries: false
  })
  const [error, setError] = useState<string | null>(null)

  // Test Neon connection
  const testConnection = async () => {
    setLoading(prev => ({ ...prev, connection: true }))
    setError(null)
    
    try {
      const response = await fetch('/api/neon-test')
      const data = await response.json()
      setConnectionStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test connection')
    } finally {
      setLoading(prev => ({ ...prev, connection: false }))
    }
  }

  // Seed Neon database
  const seedDatabase = async () => {
    setLoading(prev => ({ ...prev, seed: true }))
    setError(null)
    
    try {
      const response = await fetch('/api/neon-seed', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        alert(data.message)
        fetchDispensaries()
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to seed database')
    } finally {
      setLoading(prev => ({ ...prev, seed: false }))
    }
  }

  // Fetch dispensaries from Neon
  const fetchDispensaries = async () => {
    setLoading(prev => ({ ...prev, dispensaries: true }))
    setError(null)
    
    try {
      const response = await fetch('/api/neon-dispensaries')
      const data = await response.json()
      
      if (data.success) {
        setDispensaries(data.data)
      } else {
        setError(data.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dispensaries')
    } finally {
      setLoading(prev => ({ ...prev, dispensaries: false }))
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Neon Database Testing</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          
          <button 
            onClick={testConnection}
            disabled={loading.connection}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded mb-4 disabled:bg-gray-400"
          >
            {loading.connection ? 'Testing...' : 'Test Connection'}
          </button>
          
          {connectionStatus ? (
            <div className="mt-4 bg-gray-100 p-4 rounded">
              <p>Status: {connectionStatus.success ? '✅ Connected' : '❌ Failed'}</p>
              {connectionStatus.connection && (
                <p>Message: {connectionStatus.connection.message}</p>
              )}
              <p>Schema Initialized: {connectionStatus.initialized ? '✅ Yes' : '❌ No'}</p>
              <p>Timestamp: {connectionStatus.timestamp}</p>
            </div>
          ) : null}
        </div>
        
        <div className="border rounded p-4">
          <h2 className="text-xl font-semibold mb-4">Database Operations</h2>
          
          <div className="flex space-x-2 mb-4">
            <button 
              onClick={seedDatabase}
              disabled={loading.seed}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded disabled:bg-gray-400"
            >
              {loading.seed ? 'Seeding...' : 'Seed Database'}
            </button>
            
            <button 
              onClick={fetchDispensaries}
              disabled={loading.dispensaries}
              className="bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded disabled:bg-gray-400"
            >
              {loading.dispensaries ? 'Loading...' : 'Load Dispensaries'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Dispensaries from Neon DB</h2>
        
        {loading.dispensaries ? (
          <p>Loading dispensaries...</p>
        ) : dispensaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dispensaries.map((d: any) => (
              <div key={d.id} className="border rounded p-4">
                <h3 className="font-bold">{d.name}</h3>
                <p className="text-sm text-gray-600">{d.address}</p>
                <p className="text-sm">Rating: {d.rating} ⭐</p>
                {d.latitude && d.longitude ? (
                  <p className="text-xs text-gray-500">Location: [{d.latitude}, {d.longitude}]</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p>No dispensaries found. Try seeding the database first.</p>
        )}
      </div>
      
      <div className="mt-8">
        <Link href="/" className="text-blue-500 hover:underline">Back to Home</Link>
      </div>
    </div>
  )
}