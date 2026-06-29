const app = require('./src/app')
require('dotenv').config()

port = process.env.PORT

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})