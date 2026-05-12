// Real-time notification system using WebSockets
import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

export interface NotificationPayload {
  type: 'proposal_signed' | 'proposal_sent' | 'proposal_approved' | 'proposal_cancelled'
  data: {
    proposalId: string
    proposalNumber: string
    clientName?: string
    signedBy?: string
    timestamp: string
    message: string
  }
}

class NotificationService {
  private io: SocketIOServer | null = null

  initialize(server: HTTPServer) {
    if (!this.io) {
      this.io = new SocketIOServer(server, {
        cors: {
          origin: "*",
          methods: ["GET", "POST"]
        }
      })

      this.io.on('connection', (socket) => {
         
        // eslint-disable-next-line no-console
        console.log('Cliente conectado:', socket.id)

        // Join room for user notifications
        socket.on('join_user_room', (userId: string) => {
           
          socket.join(`user_${userId}`)
          // eslint-disable-next-line no-console
          console.log(`Usuario ${userId} joined room`)
        })

 

        socket.on('disconnect', () => {
          // eslint-disable-next-line no-console
          console.log('Cliente desconectado:', socket.id)
        })
      })
    }
  }

  sendNotification(payload: NotificationPayload, userId?: string) {
    if (!this.io) {
      console.warn('Socket.IO not initialized')
      return
    }

    if (userId) {
      // Send to specific user
      this.io.to(`user_${userId}`).emit('notification', payload)
    } else {
      // Broadcast to all connected clients
      this.io.emit('notification', payload)
    }
  }

  sendProposalSignedNotification(proposalId: string, proposalNumber: string, clientName: string, signedBy: string) {
    const payload: NotificationPayload = {
      type: 'proposal_signed',
      data: {
        proposalId,
        proposalNumber,
        clientName,
        signedBy,
        timestamp: new Date().toISOString(),
        message: `Proposta ${proposalNumber} foi assinada por ${signedBy}`
      }
    }

    this.sendNotification(payload)
  }

  sendProposalSentNotification(proposalId: string, proposalNumber: string, clientName: string) {
    const payload: NotificationPayload = {
      type: 'proposal_sent',
      data: {
        proposalId,
        proposalNumber,
        clientName,
        timestamp: new Date().toISOString(),
        message: `Proposta ${proposalNumber} foi enviada para ${clientName}`
      }
    }

    this.sendNotification(payload)
  }
}

export const notificationService = new NotificationService()
export default notificationService
