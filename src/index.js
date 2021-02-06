const path = require('path') //this is a core module. So we dont have to install it separately
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server) //socket.io expects to be called with the raw http server

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')


app.use(express.static(publicDirectoryPath))

// let count = 0

//run some code when a given client is connected
io.on('connection', (socket) => { //connection is going to get fired whenever socket.io server gets a new connection
    console.log('New WebSocket connection')

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({ id: socket.id, ...options }) //socket.id contains a unique id for every connection
        
        if (error) {
           return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })


        callback() //calling without argument that means without error

        //socket.broadcast.to.emit will make the message displayed only to a particular room 
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        if(filter.isProfane(message)) {
            return callback('Profanity is not allowed')
        }
       
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback();
    })

    //running some code when a user disconnects
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }   
    })

   
    //sending an event when server gets a new connection
    // socket.emit('countUpdated', count) //we hve used socket.emit instead of io.emit as don;t want all the connection to see the updated value

    // //recieving the event from client
    // socket.on('increment', () => {
    //     count++
    //    // socket.emit('countUpdated', count) //making sure client gets the updated count
    //     io.emit('countUpdated', count) //this is going to emit the event to every single connection thats currently available
    // })
}) 

server.listen(port, () => {
    console.log(`Server is up on port ${port}!`)
})