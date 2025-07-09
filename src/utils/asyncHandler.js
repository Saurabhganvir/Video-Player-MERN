//method 1
const asyncHandler = (requestHandler) =>{
    return (req, res, next)=>{
        Promise.resolve(requestHandler(req, res, next))
        .catch((err)=>next(err))
    }
};

export {asyncHandler};


//method 2
//higher order function 
//can accept function inside a function
//const asyncHandler = (func) => { ()=>{} }
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message,
//         })
//     }
// };


// export default asyncHandler;