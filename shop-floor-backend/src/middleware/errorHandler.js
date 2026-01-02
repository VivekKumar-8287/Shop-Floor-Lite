
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}


export default errorHandler;



// const errorMiddleware = (err, req, res, next) => {
//   console.error("Error: ",err);
//   res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
// };


// export default errorMiddleware;