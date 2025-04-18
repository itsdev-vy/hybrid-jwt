import mongoose from 'mongoose';

export const connectDB = async () => {
    await mongoose.connect(`${process.env.MONGO_URI}/${process.env.MONGO_DB_NAME}`);
};
