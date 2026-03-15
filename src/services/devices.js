import axios from 'axios'
import { API_BASE_URL } from '@/config/api.js'

const API_URL = `${API_BASE_URL}/devices`

export async function getAllDevices() {
  const res = await axios.get(API_URL)
  return res.data
}

export async function registerDevice(data) {
  const res = await axios.post(API_URL, data)
  return res.data
}

export async function updateDevice(mac, data) {
  const res = await axios.put(`${API_URL}/${mac}`, data)
  return res.data
}

export async function getPendingDevices() {
  const res = await axios.get(`${API_URL}/pending`)
  return res.data
}

export async function createPendingDevice(data) {
  const res = await axios.post(API_URL, data)
  return res.data
}
