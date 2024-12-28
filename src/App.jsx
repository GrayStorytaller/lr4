import React, { useState, useEffect } from 'react';
import axios from 'axios';
import xml2js from 'xml2js';

function App() {
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ productName: '', quantity: 0, status: '' });
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [useSoap, setUseSoap] = useState(true);

  
  const toggleSoap = () => setUseSoap(!useSoap);

  const createSoapEnvelope = (action, content) => `
    <soap:Envelope 
      xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
      xmlns:tem="http://tempuri.org/">
      <soap:Header/>
      <soap:Body>
        <tem:${action}>${content}</tem:${action}>
      </soap:Body>
    </soap:Envelope>
  `;

  const fetchOrders = async () => {
    try {
      if (useSoap) {
        const soapRequest = createSoapEnvelope('GetOrders', `
          <tem:pageNumber>1</tem:pageNumber>
          <tem:pageSize>10</tem:pageSize>
        `);

        const response = await axios.post('http://localhost:8080/Service.asmx', soapRequest, {
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': 'http://tempuri.org/IOrderService/GetOrders'
          },
        });

     
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(response.data, "application/xml");
        const fileElements = xmlDoc.getElementsByTagName("d4p1:Order");
       

        const fileElementsAsArray = Array.from(fileElements);
        // console.log(fileElementsAsArray)
        // fileElementsAsArray.splice(0, 1);
        const filesArray = fileElementsAsArray.map((file) => {
          // console.log( file.getElementsByTagName("d4p1:Id").textContent)
          const id = file.getElementsByTagName("d4p1:Id")[0].textContent;
          const productName = file.getElementsByTagName("d4p1:ProductName")[0].textContent;
          const quantity = file.getElementsByTagName("d4p1:Quantity")[0].textContent;
          const status =
            file.getElementsByTagName("d4p1:Status")[0].textContent;
          
            console.log( { id, productName, quantity, status })
            return { id, productName, quantity, status };
        })
     

        setOrders(filesArray);
      } 
      else {
        const response = await axios.get('http://localhost:8080/api/Order');
        setOrders(response.data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (useSoap) {
        let action, content;
        if (editingOrderId) {
          action = 'UpdateOrder';
          content = `
            <tem:id>${editingOrderId}</tem:id>
           <tem:order xmlns:d4p1="http://schemas.datacontract.org/2004/07/RestApiWithDb.Models">
              <Id>${editingOrderId}</Id>
              <ProductName>${form.productName}</ProductName>
              <Quantity>${form.quantity}</Quantity>
              <Status>${form.status}</Status>
            </tem:order>
          `;
        } else {
          action = 'CreateOrder';
          content = `
           <tem:order xmlns:d4p1="http://schemas.datacontract.org/2004/07/RestApiWithDb.Models">
              <ProductName>${form.productName}</ProductName>
              <Quantity>${form.quantity}</Quantity>
              <Status>${form.status}</Status>
            </tem:order>
          `;
        }

        const soapRequest = createSoapEnvelope(action, content);
        
        await axios.post('http://localhost:8080/Service.asmx', soapRequest, {
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': `http://tempuri.org/IOrderService/${action}`
          },
        });
      } else {
        if (editingOrderId) {
          await axios.put(`http://localhost:8080/api/Order/${editingOrderId}`, form);
        } else {
          await axios.post('http://localhost:8080/api/Order', form);
        }
      }
      setForm({ productName: '', quantity: 0, status: '' });
      setEditingOrderId(null);
      fetchOrders();
    } catch (error) {
      console.error('Error submitting order:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      if (useSoap) {
        const soapRequest = createSoapEnvelope('DeleteOrder', `
          <tem:id>${id}</tem:id>
        `);

        await axios.post('http://localhost:8080/Service.asmx', soapRequest, {
          headers: {
            'Content-Type': 'text/xml',
            'SOAPAction': 'http://tempuri.org/IOrderService/DeleteOrder'
          },
        });
      } else {
        await axios.delete(`http://localhost:8080/api/Order/${id}`);
      }
      fetchOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleEdit = (order) => {
    setForm({ productName: order.productName, quantity: order.quantity, status: order.status });
    setEditingOrderId(order.id);
  };

  useEffect(() => {
    fetchOrders();
  }, [useSoap]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Order Management</h1>
      <button
        onClick={toggleSoap}
        className="bg-gray-500 text-white px-4 py-2 rounded mb-4"
      >
        Switch to {useSoap ? 'REST' : 'SOAP'} Mode
      </button>
      {!useSoap&&<form onSubmit={handleSubmit} className="mb-4">
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Product Name</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-2 py-1"
            value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
            required
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Quantity</label>
          <input
            type="number"
            className="w-full border border-gray-300 rounded px-2 py-1"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Status</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded px-2 py-1"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            required
          />
        </div>
       <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          {editingOrderId ? 'Update Order' : 'Create Order'}
        </button>
      </form>
        }

      <table className="table-auto w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300 px-4 py-2">ID</th>
            <th className="border border-gray-300 px-4 py-2">Product Name</th>
            <th className="border border-gray-300 px-4 py-2">Quantity</th>
            <th className="border border-gray-300 px-4 py-2">Status</th>
            <th className="border border-gray-300 px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="border border-gray-300 px-4 py-2">{order.id}</td>
              <td className="border border-gray-300 px-4 py-2">{order.productName}</td>
              <td className="border border-gray-300 px-4 py-2">{order.quantity}</td>
              <td className="border border-gray-300 px-4 py-2">{order.status}</td>
              <td className="border border-gray-300 px-4 py-2">
                {!useSoap&&<button
                  onClick={() => handleEdit(order)}
                  className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                >
                  Edit
                </button>}
                <button
                  onClick={() => handleDelete(order.id)}
                  className="bg-red-500 text-white px-2 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;