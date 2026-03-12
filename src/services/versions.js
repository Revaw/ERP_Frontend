import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/versions`

export async function getAllVersions() {
  const res = await axios.get(API_URL)
  return res.data
}

export async function createVersion(data) {
  const res = await axios.post(API_URL, data)
  return res.data
}

export async function updateVersion(id, data) {
  const res = await axios.put(`${API_URL}/${id}`, data)
  return res.data
}
