import React from 'react';
import './aissistant.css';
import logo from '../assets/AIssistant.png';
import { useNavigate } from 'react-router-dom';

const AIssistant = () => {
  const navigate = useNavigate();

  // Function to handle box clicks
  const handleBoxClick = () => {
    navigate('/user-type');
  };

  return (
    <div className="aissistant">
      <div className='aissistant-logo'>
        <img src={logo} alt="AIssistant-logo" className='aissistant-icon' />
      </div>
      <div className='aissistant-text'>
        <h1>lorem</h1>
        <p>Lorem ipsum, dolor sit amet consectetur adipisicing elit. Eum in animi commodi non autem cum numquam error fuga architecto molestias dignissimos, nihil nostrum quod eaque fugiat ad ipsam itaque. Incidunt?</p>
        <button onClick={() => handleBoxClick()} className='aissistant-user-type'>login</button>
      </div>
    </div>
  );
};

export default AIssistant;