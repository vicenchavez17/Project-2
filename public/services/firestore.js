import firestore from '@google-cloud/firestore';

const firestore = new Firestore();
const usersCollection = firestore.collection('users');

// Store image metadata in a separate collection
const imagesCollection = firestore.collection('images');

export const createUser = async ({email, passwordHash}) => {
    const docRef = await userColleciton.add({
        email,
        passwordHash,
        createdAt: new Date().toISOString()
    });
    return docRef.id;
};

export const getUserByEmail = async (email) => {
    const snapshot = await usersCollection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return {id: doc.id, ...doc.data()};
};

export const saveImageRecord = async ({userId, gcsUri, fileName, labels, createdAt}) => {
    return imagesCollection.add({ userId, gcsUri, fileName, labels, createdAt });
};

export const getImagesForUser = async (userId) => {
    const snapshot = await imagesCollection.where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};